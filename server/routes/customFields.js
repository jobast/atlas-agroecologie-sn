const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole, denyReadOnlyRoles, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/custom-fields?dytael_id=X
router.get('/', async (req, res) => {
  const { dytael_id } = req.query;
  try {
    let sql = 'SELECT * FROM custom_fields WHERE dytael_id IS NULL';
    const params = [];
    if (dytael_id) {
      sql += ' OR dytael_id = ?';
      params.push(parseInt(dytael_id));
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /custom-fields :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/custom-fields
// DyTAEL admin only. dytael_id is forced server-side (cannot be set from body).
router.post('/', authenticateToken, denyReadOnlyRoles, requireRole('dytael_admin'), async (req, res) => {
  const { field_key, field_label, field_type = 'text', required = false } = req.body;
  if (!field_key || !field_label) {
    return res.status(400).json({ error: 'field_key et field_label sont requis' });
  }

  // super_admin can pass body.dytael_id (or null for global). Everyone else
  // is locked to their own DyTAEL.
  let targetDytaelId;
  if (isSuperAdmin(req.user.role)) {
    targetDytaelId = req.body.dytael_id != null && req.body.dytael_id !== ''
      ? parseInt(req.body.dytael_id)
      : null;
    if (targetDytaelId !== null && Number.isNaN(targetDytaelId)) targetDytaelId = null;
  } else {
    if (!req.user.dytael_id) {
      return res.status(403).json({ error: "Aucun DyTAEL associé à votre compte." });
    }
    targetDytaelId = req.user.dytael_id;
  }

  try {
    await pool.query(
      'INSERT INTO custom_fields (field_key, field_label, field_type, required, dytael_id) VALUES (?, ?, ?, ?, ?)',
      [field_key, field_label, field_type, !!required, targetDytaelId]
    );
    res.status(201).json({ message: 'Champ créé' });
  } catch (err) {
    console.error('Erreur POST /custom-fields :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
