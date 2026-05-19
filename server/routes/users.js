const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, normalizeRole, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

const RESET_SECRET = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || 'supersecretkey';

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

    if (!hasRole(userRole, 'dytaes_admin') && req.user.dytael_id) {
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

// Invite a new user by email. The inviter is typically a super_admin or
// dytaes_admin assigning an admin to a DyTAEL who isn't yet on the platform.
// We create the account with a random throwaway password (confirmed, so the
// login check passes the moment they set a real one), then email them an
// invitation link that reuses the existing reset-password page.
router.post('/invite', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { email, name, surname, dytael_id, role } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email invalide.' });
  }

  const inviterRole = normalizeRole(req.user.role);
  const targetRole = role || 'dytael_admin';

  // A plain dytael_admin can only invite into their own DyTAEL and cannot
  // hand out elevated roles. dytaes_admin and super_admin have no such limit.
  if (inviterRole === 'dytael_admin') {
    if (dytael_id && parseInt(dytael_id, 10) !== req.user.dytael_id) {
      return res.status(403).json({ message: 'Vous ne pouvez inviter que dans votre DyTAEL.' });
    }
    if (['dytaes_admin', 'super_admin'].includes(targetRole)) {
      return res.status(403).json({ message: 'Rôle non autorisé pour ce niveau.' });
    }
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    }

    let dytaelName = null;
    if (dytael_id) {
      const [dRows] = await pool.query('SELECT name FROM dytaels WHERE id = ? AND active = true', [dytael_id]);
      if (dRows.length === 0) {
        return res.status(400).json({ message: 'DyTAEL invalide.' });
      }
      dytaelName = dRows[0].name;
    }

    // Throwaway password — the invitee will overwrite it via the invite link.
    const randomPwd = crypto.randomBytes(24).toString('hex');
    const hash = await bcrypt.hash(randomPwd, 10);

    // confirmed=0 until the invitee sets their password via the invite link,
    // which lets us flag pending invitations in the admin UI.
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, name, surname, dytael_id, confirmed) VALUES (LOWER(?), ?, ?, ?, ?, ?, 0)',
      [email, hash, targetRole, name || null, surname || null, dytael_id || null]
    );
    const newId = result.insertId;

    // Invite token: 7-day window, fingerprint tied to the placeholder hash so
    // it's single-use (once the password is set, fingerprint shifts and the
    // token can't be replayed).
    const pwFingerprint = hash.slice(-10);
    const token = jwt.sign({ id: newId, pwf: pwFingerprint }, RESET_SECRET, { expiresIn: '7d' });

    // Look up the inviter's email - it isn't in the JWT payload.
    let inviterEmail = null;
    try {
      const [meRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
      inviterEmail = meRows[0]?.email || null;
    } catch { /* non-blocking */ }

    const { sendInvitationEmail } = require('../utils/mailer');
    await sendInvitationEmail({ email, token, dytaelName, inviterEmail });

    res.status(201).json({
      id: newId,
      email: email.toLowerCase(),
      role: targetRole,
      dytael_id: dytael_id || null,
      dytael_name: dytaelName,
      name: name || null,
      surname: surname || null,
      confirmed: 1
    });
  } catch (err) {
    console.error('Erreur /invite :', err);
    res.status(500).json({ message: "Erreur lors de l'invitation." });
  }
});

// Update user: dytael_admin can update within their DyTAEL, dytaes_admin can update any
router.put('/:id', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { role, name, surname, phone, email, organization, dytael_id } = req.body;
  const userRole = normalizeRole(req.user.role);

  try {
    // dytaes_admin and super_admin have unrestricted access; lower roles
    // can only touch users in their own DyTAEL and can't grant higher roles.
    const isHighLevel = hasRole(userRole, 'dytaes_admin');
    if (!isHighLevel) {
      if (['dytaes_admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ message: 'Vous ne pouvez pas promouvoir à ce rôle.' });
      }
      const [targetRows] = await pool.query('SELECT dytael_id FROM users WHERE id = ?', [req.params.id]);
      if (targetRows.length === 0) return res.sendStatus(404);
      if (targetRows[0].dytael_id !== req.user.dytael_id) {
        return res.status(403).json({ message: 'Accès interdit à cet utilisateur.' });
      }
      await pool.query(
        'UPDATE users SET role = ?, name = ?, surname = ?, phone = ?, email = ?, organization = ? WHERE id = ?',
        [role, name, surname, phone, email, organization, req.params.id]
      );
    } else {
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
    if (!hasRole(userRole, 'dytaes_admin') && req.user.dytael_id) {
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
    if (!hasRole(userRole, 'dytaes_admin') && req.user.dytael_id) {
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
