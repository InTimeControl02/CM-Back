const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// GET /workgroups — lista de grupos de trabajo para dropdowns
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT WorkGroupID, WGCode, WGLeader, Foreman, Supervisor, GroupSelect
      FROM db09_comm.ltblworkgroup
      ORDER BY WGCode
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workgroups — crear grupo de trabajo
router.post('/', async (req, res) => {
  try {
    const { wgCode, wgLeader, foreman, supervisor, password, groupSelect } = req.body;

    if (!wgCode || !wgLeader) {
      return res.status(400).json({ error: 'wgCode y wgLeader son requeridos' });
    }

    if (wgCode.length > 8) {
      return res.status(400).json({ error: 'wgCode no puede exceder 8 caracteres' });
    }

    if (password && password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const [existing] = await pool.query(
      'SELECT WorkGroupID FROM db09_comm.ltblworkgroup WHERE WGCode = ?',
      [wgCode]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'WGCode ya existe' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const [result] = await pool.query(
      `INSERT INTO db09_comm.ltblworkgroup (WGCode, WGLeader, Foreman, Supervisor, Password, GroupSelect)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [wgCode, wgLeader, foreman ?? null, supervisor ?? null, passwordHash, groupSelect ?? null]
    );

    const [rows] = await pool.query(
      'SELECT WorkGroupID, WGCode, WGLeader, Foreman, Supervisor, GroupSelect FROM db09_comm.ltblworkgroup WHERE WorkGroupID = ?',
      [result.insertId]
    );

    res.status(201).json({ message: 'Grupo de trabajo creado', workgroup: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /workgroups/:wgCode — editar grupo, todos los campos opcionales
router.put('/:wgCode', async (req, res) => {
  try {
    const { wgLeader, foreman, supervisor, password, groupSelect } = req.body;

    const [existing] = await pool.query(
      'SELECT WorkGroupID FROM db09_comm.ltblworkgroup WHERE WGCode = ?',
      [req.params.wgCode]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: `Grupo "${req.params.wgCode}" no encontrado` });
    }

    const fields = [];
    const values = [];

    if (wgLeader !== undefined) { fields.push('WGLeader = ?'); values.push(wgLeader); }
    if (foreman !== undefined) { fields.push('Foreman = ?'); values.push(foreman); }
    if (supervisor !== undefined) { fields.push('Supervisor = ?'); values.push(supervisor); }
    if (groupSelect !== undefined) { fields.push('GroupSelect = ?'); values.push(groupSelect); }

    if (password !== undefined) {
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      fields.push('Password = ?');
      values.push(await bcrypt.hash(password, 12));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos a actualizar' });
    }

    await pool.query(
      `UPDATE db09_comm.ltblworkgroup SET ${fields.join(', ')} WHERE WGCode = ?`,
      [...values, req.params.wgCode]
    );

    const [rows] = await pool.query(
      'SELECT WorkGroupID, WGCode, WGLeader, Foreman, Supervisor, GroupSelect FROM db09_comm.ltblworkgroup WHERE WGCode = ?',
      [req.params.wgCode]
    );

    res.json({ message: 'Grupo de trabajo actualizado', workgroup: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /workgroups/:wgCode — eliminar grupo de trabajo
router.delete('/:wgCode', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT WorkGroupID FROM db09_comm.ltblworkgroup WHERE WGCode = ?',
      [req.params.wgCode]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: `Grupo "${req.params.wgCode}" no encontrado` });
    }

    await pool.query(
      'DELETE FROM db09_comm.ltblworkgroup WHERE WGCode = ?',
      [req.params.wgCode]
    );

    res.json({ message: `Grupo "${req.params.wgCode}" eliminado` });
  } catch (err) {
    // FK: usuarios móviles u otras tablas aún referencian este WGCode
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        error: 'No se puede eliminar: el grupo tiene usuarios o registros asociados',
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
