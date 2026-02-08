const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/dytaels - List active DyTAELs (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom FROM dytaels WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /api/dytaels:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dytaels/:slug - Single DyTAEL by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom, active FROM dytaels WHERE slug = ?',
      [req.params.slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'DyTAEL introuvable' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /api/dytaels/:slug:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/dytaels - Create DyTAEL (dytaes_admin only)
router.post('/', authenticateToken, requireRole('dytaes_admin'), async (req, res) => {
  const { name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom } = req.body;
  if (!name || !slug || bounds_sw_lat == null || bounds_sw_lon == null || bounds_ne_lat == null || bounds_ne_lon == null) {
    return res.status(400).json({ error: 'Champs requis: name, slug, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO dytaels (name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, description || null, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom || 10]
    );
    res.status(201).json({ id: result.insertId, message: 'DyTAEL créé' });
  } catch (err) {
    console.error('Erreur POST /api/dytaels:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Un DyTAEL avec ce nom ou slug existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/dytaels/:id - Update DyTAEL (dytaes_admin only)
router.put('/:id', authenticateToken, requireRole('dytaes_admin'), async (req, res) => {
  const { name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom, active } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE dytaels SET name = ?, slug = ?, description = ?, bounds_sw_lat = ?, bounds_sw_lon = ?, bounds_ne_lat = ?, bounds_ne_lon = ?, default_zoom = ?, active = ? WHERE id = ?`,
      [name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom || 10, active !== false, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'DyTAEL introuvable' });
    }
    res.json({ message: 'DyTAEL mis à jour' });
  } catch (err) {
    console.error('Erreur PUT /api/dytaels/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/dytaels/:id - Soft delete (dytaes_admin only)
router.delete('/:id', authenticateToken, requireRole('dytaes_admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE dytaels SET active = false WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'DyTAEL introuvable' });
    }
    res.json({ message: 'DyTAEL désactivé' });
  } catch (err) {
    console.error('Erreur DELETE /api/dytaels/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
