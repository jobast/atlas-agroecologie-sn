const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/custom-fields?dytael=X
router.get('/', async (req, res) => {
  const { dytael } = req.query;
  try {
    let sql = 'SELECT * FROM custom_fields WHERE dytael IS NULL';
    const params = [];
    if (dytael) {
      sql += ' OR dytael = ?';
      params.push(dytael);
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /custom-fields :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/custom-fields (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { field_key, field_label, field_type = 'text', required = false, dytael = null } = req.body;
  if (!field_key || !field_label) {
    return res.status(400).json({ error: 'field_key et field_label sont requis' });
  }
  try {
    await pool.query(
      'INSERT INTO custom_fields (field_key, field_label, field_type, required, dytael) VALUES (?, ?, ?, ?, ?)',
      [field_key, field_label, field_type, !!required, dytael || null]
    );
    res.status(201).json({ message: 'Champ créé' });
  } catch (err) {
    console.error('Erreur POST /custom-fields :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
