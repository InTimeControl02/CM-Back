const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { sendVerificationCode, sendPasswordResetCode } = require('../lib/mailer');

const VERIFICATION_MINUTES = parseInt(process.env.VERIFICATION_MINUTES, 10) || 10;

function signToken(user, rememberMe = false) {
  return jwt.sign(
    {
      userID: user.UserID,
      username: user.Username,
      role: user.Role,
      wgCode: user.WGCode,
    },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? (process.env.JWT_EXPIRES_IN_REMEMBER || '30d') : (process.env.JWT_EXPIRES_IN || '7d') }
  );
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digitos
}

async function generateAndSendCode(user) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_MINUTES * 60000);

  await pool.query(
    'UPDATE db09_comm.tblmobileusers SET VerificationCode = ?, VerificationExpiresAt = ? WHERE UserID = ?',
    [code, expiresAt, user.UserID]
  );

  await sendVerificationCode(user.Email, code, VERIFICATION_MINUTES, user.Username);
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email y password son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const [existing] = await pool.query(
      'SELECT UserID FROM db09_comm.tblmobileusers WHERE Username = ? OR Email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username o email ya registrado' });
    }

    const hash = await bcrypt.hash(password, 12);
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const [result] = await pool.query(
      'INSERT INTO db09_comm.tblmobileusers (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)',
      [username, email, hash, assignedRole]
    );

    const [rows] = await pool.query(
      'SELECT UserID, Username, Email, Role, WGCode FROM db09_comm.tblmobileusers WHERE UserID = ?',
      [result.insertId]
    );

    await generateAndSendCode(rows[0]);

    res.status(201).json({
      status: 'verification_required',
      message: 'Cuenta creada. Se envió un código de verificación a tu correo.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'email y code son requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM db09_comm.tblmobileusers WHERE Email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Correo no registrado' });
    }

    const user = rows[0];

    if (user.EmailVerifiedAt) {
      return res.status(409).json({ error: 'Correo ya verificado' });
    }

    if (!user.VerificationCode || user.VerificationCode !== code) {
      return res.status(422).json({ error: 'Código incorrecto' });
    }

    if (!user.VerificationExpiresAt || new Date(user.VerificationExpiresAt) < new Date()) {
      return res.status(422).json({ error: 'Código expirado. Solicita uno nuevo.' });
    }

    await pool.query(
      `UPDATE db09_comm.tblmobileusers
       SET EmailVerifiedAt = NOW(), VerificationCode = NULL, VerificationExpiresAt = NULL
       WHERE UserID = ?`,
      [user.UserID]
    );

    const token = signToken(user);
    res.json({
      token,
      user: {
        userID: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        wgCode: user.WGCode,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email es requerido' });

    const [rows] = await pool.query(
      'SELECT * FROM db09_comm.tblmobileusers WHERE Email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Correo no registrado' });
    }

    const user = rows[0];
    if (user.EmailVerifiedAt) {
      return res.status(409).json({ error: 'Correo ya verificado' });
    }

    const cooldownActive =
      user.VerificationExpiresAt &&
      new Date(user.VerificationExpiresAt) > new Date(Date.now() + (VERIFICATION_MINUTES - 1) * 60000);

    if (cooldownActive) {
      return res.status(429).json({ error: 'Ya se envió un código recientemente. Espera antes de solicitar otro.' });
    }

    await generateAndSendCode(user);
    res.json({ message: 'Nuevo código enviado a tu correo.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM db09_comm.tblmobileusers WHERE Username = ? AND IsActive = 1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no registrado' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(422).json({ error: 'Las credenciales no son correctas' });
    }

    if (!user.EmailVerifiedAt) {
      const cooldownActive =
        user.VerificationExpiresAt &&
        new Date(user.VerificationExpiresAt) > new Date(Date.now() + (VERIFICATION_MINUTES - 1) * 60000);

      if (!cooldownActive) {
        await generateAndSendCode(user);
      }

      return res.status(200).json({
        status: 'verification_required',
        message: 'Este correo no está verificado. Se envió un nuevo código.',
      });
    }

    const token = signToken(user, !!rememberMe);
    res.json({
      token,
      user: {
        userID: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        wgCode: user.WGCode,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/forgot-password — paso 1: enviar código al correo
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email es requerido' });

    const [rows] = await pool.query(
      'SELECT UserID, Username, Email, PasswordResetExpiresAt FROM db09_comm.tblmobileusers WHERE Email = ? AND IsActive = 1',
      [email]
    );

    // Respuesta genérica — no revela si el email existe
    if (rows.length === 0) {
      return res.json({ message: 'Si el correo está registrado, recibirás un código.' });
    }

    const user = rows[0];

    const cooldownActive =
      user.PasswordResetExpiresAt &&
      new Date(user.PasswordResetExpiresAt) > new Date(Date.now() + (VERIFICATION_MINUTES - 1) * 60000);

    if (cooldownActive) {
      return res.status(429).json({ error: 'Ya se envió un código recientemente. Espera antes de solicitar otro.' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_MINUTES * 60000);

    await pool.query(
      'UPDATE db09_comm.tblmobileusers SET PasswordResetCode = ?, PasswordResetExpiresAt = ?, PasswordResetToken = NULL WHERE UserID = ?',
      [code, expiresAt, user.UserID]
    );

    await sendPasswordResetCode(user.Email, code, VERIFICATION_MINUTES, user.Username);

    res.json({ message: 'Si el correo está registrado, recibirás un código.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/verify-reset-code — paso 2: validar código, obtener resetToken
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'email y code son requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT UserID, PasswordResetCode, PasswordResetExpiresAt FROM db09_comm.tblmobileusers WHERE Email = ? AND IsActive = 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Correo no registrado' });
    }

    const user = rows[0];

    if (!user.PasswordResetCode || user.PasswordResetCode !== code) {
      return res.status(422).json({ error: 'Código incorrecto' });
    }

    if (!user.PasswordResetExpiresAt || new Date(user.PasswordResetExpiresAt) < new Date()) {
      return res.status(422).json({ error: 'Código expirado. Solicita uno nuevo.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE db09_comm.tblmobileusers SET PasswordResetCode = NULL, PasswordResetToken = ? WHERE UserID = ?',
      [resetToken, user.UserID]
    );

    res.json({ resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/reset-password — paso 3: cambiar contraseña con resetToken
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'email, resetToken y newPassword son requeridos' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const [rows] = await pool.query(
      'SELECT UserID, PasswordResetToken, PasswordResetExpiresAt FROM db09_comm.tblmobileusers WHERE Email = ? AND IsActive = 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Correo no registrado' });
    }

    const user = rows[0];

    if (!user.PasswordResetToken || user.PasswordResetToken !== resetToken) {
      return res.status(422).json({ error: 'Token inválido. Reinicia el proceso.' });
    }

    if (!user.PasswordResetExpiresAt || new Date(user.PasswordResetExpiresAt) < new Date()) {
      return res.status(422).json({ error: 'Sesión expirada. Solicita un nuevo código.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE db09_comm.tblmobileusers SET PasswordHash = ?, PasswordResetCode = NULL, PasswordResetToken = NULL, PasswordResetExpiresAt = NULL WHERE UserID = ?',
      [hash, user.UserID]
    );

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
