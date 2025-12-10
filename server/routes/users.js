const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// Liste des utilisateurs : admin uniquement
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, email, role, name, surname, phone, created_at, last_login, confirmed
      FROM users
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /users :', err);
    res.sendStatus(500);
  }
});

// Mise à jour d'un utilisateur : admin uniquement
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { role, name, surname, phone, email, organization } = req.body;
  try {
    await pool.query(
      'UPDATE users SET role = ?, name = ?, surname = ?, phone = ?, email = ?, organization = ? WHERE id = ?',
      [role, name, surname, phone, email, organization, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur PUT /users/:id :', err);
    res.sendStatus(500);
  }
});

// Confirmation d'un utilisateur : admin uniquement
router.patch('/:id/confirm', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET confirmed = true WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur confirmation utilisateur :', err);
    res.sendStatus(500);
  }
});

// Suppression d'un utilisateur : admin uniquement
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur suppression utilisateur :', err);
    res.sendStatus(500);
  }
});

module.exports = router;
