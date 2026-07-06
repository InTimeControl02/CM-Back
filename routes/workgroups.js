const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /workgroups — lista de grupos de trabajo para dropdowns
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT WorkGroupID, WGCode, WGLeader, Foreman, Supervisor
      FROM db09_comm.ltblworkgroup
      ORDER BY WGCode
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
