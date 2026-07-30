const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_ENCRYPTION === 'ssl',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

const LOGO_ICON_PATH = path.join(__dirname, '..', 'public', 'images', 'favicon_logo_ITC-removebg.png');

function buildEmailLayout(nombre, code, minutes, bodyContent) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F3F4F6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F3F4F6; margin: 0; padding: 0; text-align: center;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%"
    style="background-color: #F3F4F6; padding: 40px 10px;">
    <tr>
      <td align="center">

        <table border="0" cellpadding="0" cellspacing="0" width="100%"
          style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; border-top: 4px solid #2563EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; margin: 0 auto;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #FFFFFF; padding: 40px 20px 20px 20px;">
              <img src="cid:logoIcon" alt="In Time Control" width="100"
                style="display: block; border: 0; outline: none; text-decoration: none; margin: 0 auto 10px auto; max-width: 100%;">
              <h1 style="color: #1F2937; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">
                In Time Control
              </h1>
            </td>
          </tr>

          <!-- Separador -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 0;">
            </td>
          </tr>

          <!-- Contenido dinámico -->
          <tr>
            <td align="left" style="padding: 30px 40px 40px 40px; color: #4B5563; font-size: 16px; line-height: 1.6;">

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1F2937;">
                Hola, <strong>${nombre}</strong>
              </p>

              ${bodyContent(code, minutes)}

              <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0;">

              <!-- Tarjeta firma ITC -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%"
                style="border-radius: 6px; overflow: hidden;">
                <tr>
                  <td width="38%" valign="middle" align="center"
                    style="background-color: #0F1E33; padding: 18px 12px;">
                    <img src="cid:logoIcon" alt="ITC" width="48"
                      style="display: block; margin: 0 auto 8px auto; border: 0;">
                    <p style="margin: 0; color: #FFFFFF; font-size: 10px; font-weight: bold;
                               letter-spacing: 0.5px; line-height: 1.4; text-align: center;">
                      BETTER, DIFFERENT<br>AND IN TIME
                    </p>
                  </td>
                  <td valign="middle"
                    style="background-color: #F8FAFC; padding: 14px 16px; border-left: 3px solid #2563EB;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #1F2937;">
                      In Time Control
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 5px;">
                      <tr>
                        <td style="font-size: 13px; color: #2563EB; width: 18px;">&#9993;</td>
                        <td style="font-size: 11px; color: #4B5563;">info@intimecontrol.com</td>
                      </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 5px;">
                      <tr>
                        <td style="font-size: 13px; color: #2563EB; width: 18px;">&#8853;</td>
                        <td style="font-size: 11px; color: #4B5563;">www.intimecontrol.com</td>
                      </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 5px;">
                      <tr>
                        <td style="font-size: 13px; color: #2563EB; width: 18px;">&#9742;</td>
                        <td style="font-size: 11px; color: #4B5563;">+52 811 334 0057</td>
                      </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #2563EB; width: 18px;">&#9670;</td>
                        <td style="font-size: 11px; color: #4B5563;">Blvd. Millenium #5060, Apodaca N.L.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%"
          style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center"
              style="padding: 20px 30px; color: #6B7280; font-size: 13px; line-height: 1.5;">
              <p style="margin: 0;">
                Este mensaje ha sido generado automáticamente por el sistema.<br>
                Por favor, no responda a este correo.
              </p>
              <p style="margin: 10px 0 0 0;">
                &copy; ${year} In Time Control.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function codeBlock(code) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <div style="
            display: inline-block;
            background-color: #1E3A5F;
            color: #FFFFFF;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 10px;
            padding: 18px 32px;
            border-radius: 8px;
            font-family: 'Courier New', Courier, monospace;
          ">
            ${code}
          </div>
        </td>
      </tr>
    </table>`;
}

function verificationBody(code, minutes) {
  return `
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #4B5563; line-height: 1.6;">
      Gracias por registrarte. Para activar tu cuenta ingresa el siguiente código de verificación:
    </p>
    ${codeBlock(code)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280; text-align: center;">
      Este código es válido por <strong>${minutes} minutos</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6B7280; text-align: center;">
      Si no creaste esta cuenta, ignora este mensaje.
    </p>`;
}

function passwordResetBody(code, minutes) {
  return `
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #4B5563; line-height: 1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código para continuar:
    </p>
    ${codeBlock(code)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280; text-align: center;">
      Este código es válido por <strong>${minutes} minutos</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6B7280; text-align: center;">
      Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
    </p>`;
}

function buildAttachments() {
  if (!fs.existsSync(LOGO_ICON_PATH)) return [];
  return [{ filename: 'favicon_logo_ITC-removebg.png', path: LOGO_ICON_PATH, cid: 'logoIcon' }];
}

async function sendVerificationCode(toEmail, code, minutes, nombre = '') {
  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Código de verificación - CM',
    text: `Hola ${nombre}\n\nTu código de verificación es: ${code}\n\nExpira en ${minutes} minutos.`,
    html: buildEmailLayout(nombre, code, minutes, verificationBody),
    attachments: buildAttachments(),
  });
}

async function sendPasswordResetCode(toEmail, code, minutes, nombre = '') {
  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Restablecer contraseña - CM',
    text: `Hola ${nombre}\n\nTu código para restablecer la contraseña es: ${code}\n\nExpira en ${minutes} minutos.\n\nSi no solicitaste este cambio, ignora este correo.`,
    html: buildEmailLayout(nombre, code, minutes, passwordResetBody),
    attachments: buildAttachments(),
  });
}

module.exports = { sendVerificationCode, sendPasswordResetCode };
