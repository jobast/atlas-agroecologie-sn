const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole, normalizeRole } = require('../middleware/authMiddleware');
const router = express.Router();

// List users: dytael_admin sees their DyTAEL's users, dytaes_admin sees all
router.get('/', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  try {
    const userRole = normalizeRole(req.user.role);
    let sql = `
      SELECT u.id, u.email, u.role, u.name, u.surname, u.phone, u.created_at, u.last_login, u.confirmed, u.dytael_id, d.name as dytael_name
      FROM users u
      LEFT JOIN dytaels d ON u.dytael_id = d.id
    `;
    const params = [];

    if (userRole !== 'dytaes_admin' && req.user.dytael_id) {
      sql += ' WHERE u.dytael_id = ?';
      params.push(req.user.dytael_id);
    }

    sql += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /users :', err);
    res.sendStatus(500);
  }
});

// Update user: dytael_admin can update within their DyTAEL, dytaes_admin can update any
router.put('/:id', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { role, name, surname, phone, email, organization, dytael_id } = req.body;
  const userRole = normalizeRole(req.user.role);

  try {
    // dytael_admin cannot change dytael_id or promote to dytaes_admin
    if (userRole !== 'dytaes_admin') {
      if (role === 'dytaes_admin') {
        return res.status(403).json({ message: 'Vous ne pouvez pas promouvoir au rôle dytaes_admin.' });
      }
      // Verify target user belongs to same DyTAEL
      const [targetRows] = await pool.query('SELECT dytael_id FROM users WHERE id = ?', [req.params.id]);
      if (targetRows.length === 0) return res.sendStatus(404);
      if (targetRows[0].dytael_id !== req.user.dytael_id) {
        return res.status(403).json({ message: 'Accès interdit à cet utilisateur.' });
      }
      // dytael_admin cannot change dytael_id
      await pool.query(
        'UPDATE users SET role = ?, name = ?, surname = ?, phone = ?, email = ?, organization = ? WHERE id = ?',
        [role, name, surname, phone, email, organization, req.params.id]
      );
    } else {
      // dytaes_admin can update everything including dytael_id
      await pool.query(
        'UPDATE users SET role = ?, name = ?, surname = ?, phone = ?, email = ?, organization = ?, dytael_id = ? WHERE id = ?',
        [role, name, surname, phone, email, organization, dytael_id || null, req.params.id]
      );
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur PUT /users/:id :', err);
    res.sendStatus(500);
  }
});

// Confirm user
router.patch('/:id/confirm', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user.role);
    // Verify DyTAEL ownership for dytael_admin
    if (userRole !== 'dytaes_admin' && req.user.dytael_id) {
      const [targetRows] = await pool.query('SELECT dytael_id FROM users WHERE id = ?', [id]);
      if (targetRows.length === 0) return res.sendStatus(404);
      if (targetRows[0].dytael_id !== req.user.dytael_id) {
        return res.status(403).json({ message: 'Accès interdit à cet utilisateur.' });
      }
    }
    await pool.query('UPDATE users SET confirmed = true WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur confirmation utilisateur :', err);
    res.sendStatus(500);
  }
});

// Delete user
router.delete('/:id', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user.role);
    // Verify DyTAEL ownership for dytael_admin
    if (userRole !== 'dytaes_admin' && req.user.dytael_id) {
      const [targetRows] = await pool.query('SELECT dytael_id FROM users WHERE id = ?', [id]);
      if (targetRows.length === 0) return res.sendStatus(404);
      if (targetRows[0].dytael_id !== req.user.dytael_id) {
        return res.status(403).json({ message: 'Accès interdit à cet utilisateur.' });
      }
    }
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur suppression utilisateur :', err);
    res.sendStatus(500);
  }
});

module.exports = router;
