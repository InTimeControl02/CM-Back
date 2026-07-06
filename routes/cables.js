const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateCableFields } = require('../middleware/validateCableFields');

/*
  GET /cables?type=pulling|testing|connecting&search=texto

  pulling    → PulledDate IS NULL
  testing    → PulledDate IS NOT NULL AND TestedDate IS NULL AND NeedInsulTest != 0
  connecting → PulledDate IS NOT NULL AND TestedDate IS NOT NULL
               AND (ConnectedDate_From IS NULL OR ConnectedDate_To IS NULL)

  search (opcional) → filtra por CableNo, FromEqNo, ToEqNo, CableType con LIKE %texto%

  Nota: NeedInsulTest se almacena como -1 (True en Access) o 0 (False).
        MySQL TRUE = 1, no matchea -1 → usamos != 0.
*/

const BASE_FIELDS = {
  all: `
    SELECT
      CableNo, FromEqNo, FromEqDescription, FromLocation,
      ToEqNo, ToEqDescription, ToLocation, CableType,
      PulledDate, TestedDate, ConnectedDate_From, ConnectedDate_To,
      NeedInsulTest
    FROM db07_const_cm.tblcableschedule
    WHERE 1=1
  `,
  pulling: `
    SELECT
      CableNo, FromEqNo, FromEqDescription, FromLocation,
      ToEqNo, ToEqDescription, ToLocation, CableType, PulledDate
    FROM db07_const_cm.tblcableschedule
    WHERE PulledDate IS NULL
  `,
  testing: `
    SELECT
      CableNo, FromEqNo, FromEqDescription, FromLocation,
      ToEqNo, ToEqDescription, ToLocation, CableType,
      PulledDate, TestedDate, NeedInsulTest
    FROM db07_const_cm.tblcableschedule
    WHERE
      PulledDate IS NOT NULL
      AND TestedDate IS NULL
      AND NeedInsulTest != 0
  `,
  connecting: `
    SELECT
      CableNo, FromEqNo, FromEqDescription, FromLocation,
      ToEqNo, ToEqDescription, ToLocation, CableType,
      PulledDate, TestedDate, ConnectedDate_From, ConnectedDate_To
    FROM db07_const_cm.tblcableschedule
    WHERE
      PulledDate IS NOT NULL
      AND TestedDate IS NOT NULL
      AND (ConnectedDate_From IS NULL OR ConnectedDate_To IS NULL)
  `,
};

const SEARCH_CLAUSE = `
  AND (
    CableNo       LIKE ?
    OR FromEqNo   LIKE ?
    OR ToEqNo     LIKE ?
    OR CableType  LIKE ?
  )
`;

router.get('/', async (req, res) => {
  const { type, search, page, limit } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Parámetro "type" requerido: pulling | testing | connecting' });
  }

  const baseQuery = BASE_FIELDS[type];
  if (!baseQuery) {
    return res.status(400).json({ error: `type inválido. Opciones: ${Object.keys(BASE_FIELDS).join(', ')}` });
  }

  let whereClause = baseQuery;
  const whereParams = [];

  if (search && search.trim() !== '') {
    const like = `%${search.trim()}%`;
    whereClause += SEARCH_CLAUSE;
    whereParams.push(like, like, like, like);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const offset = (pageNum - 1) * limitNum;

  try {
    const countQuery = whereClause.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) AS total FROM');
    const [[{ total }]] = await pool.query(countQuery, whereParams);

    const dataQuery = `${whereClause} ORDER BY CableNo DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataQuery, [...whereParams, limitNum, offset]);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /cables/:cableNo — detalle completo de un cable individual
router.get('/:cableNo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        CableNo, FromEqNo, FromEqDescription, FromLocation,
        ToEqNo, ToEqDescription, ToLocation, CableType,
        DesignLength, PulledLength, DrumNo,
        PulledDate, WGPulled, PulledPending,
        TestedDate, WGTested,
        ConnectedDate_From, WGConnected_From, ConnectedPending_From,
        ConnectedDate_To, WGConnected_To, ConnectedPending_To,
        NeedInsulTest, NeedHipotTest, Remarks
      FROM db07_const_cm.tblcableschedule
      WHERE CableNo = ?`,
      [req.params.cableNo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Cable "${req.params.cableNo}" no encontrado` });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /cables/:cableNo — editar cable, todos los campos opcionales
router.put('/:cableNo', validateCableFields, async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos a actualizar' });
    }

    const [existing] = await pool.query(
      'SELECT CableNo FROM db07_const_cm.tblcableschedule WHERE CableNo = ?',
      [req.params.cableNo]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: `Cable "${req.params.cableNo}" no encontrado` });
    }

    const setClause = updates.map(([field]) => `${field} = ?`).join(', ');
    const values = updates.map(([, value]) => value);

    await pool.query(
      `UPDATE db07_const_cm.tblcableschedule SET ${setClause} WHERE CableNo = ?`,
      [...values, req.params.cableNo]
    );

    const [rows] = await pool.query(
      'SELECT * FROM db07_const_cm.tblcableschedule WHERE CableNo = ?',
      [req.params.cableNo]
    );

    res.json({ message: 'Cable actualizado', cable: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
