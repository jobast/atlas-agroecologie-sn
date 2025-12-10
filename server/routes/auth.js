const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const crypto = require('crypto');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'supersecretkey';
const RESET_SECRET = process.env.JWT_RESET_SECRET || SECRET;

// 🚀 INSCRIPTION
router.post('/register', async (req, res) => {
  // Filtrer explicitement les champs nécessaires
  const {
    email,
    password,
    name,
    surname,
    phone,
    organization
  } = req.body;

  // Ne rien conserver d’autre
  if (!email || !password || !name || !surname || !phone || !organization) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Email invalide" });
  }
  console.log('Données reçues pour inscription :', req.body);
  console.log("✅ Données reçues:", req.body);

  try {
    console.log("🔍 Vérification existence utilisateur...");
    // Vérifier si l'utilisateur existe déjà
    const [existing] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    console.log("🔐 Hashing du mot de passe...");
    // Hasher le mot de passe
    const hash = await bcrypt.hash(password, 10);

    console.log("💾 Insertion dans la base...");
    // Enregistrer l'utilisateur
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, name, surname, phone, organization) VALUES (LOWER(?), ?, ?, ?, ?, ?, ?)',
      [email, hash, 'editor', name, surname, phone, organization]
    );

    const insertedId = result.insertId;

    // Générer un token de confirmation après avoir inséré l'utilisateur
    const token = jwt.sign({ id: insertedId }, SECRET, { expiresIn: '1d' });

    console.log("📨 Envoi de l'email de confirmation...");
    // Envoyer l'email de confirmation
    const { sendConfirmationEmail } = require('../utils/mailer');
    await sendConfirmationEmail(email, token);

    console.log("✅ Inscription terminée");
    res.status(201).json({
      id: insertedId,
      email,
      role: 'editor',
      name,
      surname,
      phone,
      organization,
      message: "Inscription réussie. Veuillez vérifier votre email pour confirmer votre compte."
    });
  } catch (err) {
    console.error('Erreur dans la route /register :', err);  // Message explicite
    res.status(500).json({
      message: 'Erreur interne lors de l’inscription.',
      error: err.message || 'Unknown error'
    });
  }
});

// ✅ CONFIRMATION PAR EMAIL
router.get('/confirm/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const decoded = jwt.verify(token, SECRET);
    const userId = decoded.id;

    // Mise à jour de l'utilisateur : confirmation
    const [updateRes] = await pool.query(
      'UPDATE users SET confirmed = true WHERE id = ?',
      [userId]
    );

    res.send(`✅ Email confirmé. Vous pouvez maintenant vous connecter.`);
  } catch (err) {
    console.error('Erreur /confirm :', err);
    res.status(400).send('❌ Lien invalide ou expiré.');
  }
});

// 🔐 CONNEXION
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const u = rows[0];

    if (!u) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    if (!u.confirmed) {
      return res.status(403).json({ message: 'Veuillez confirmer votre email avant de vous connecter.' });
    }

    if (!(await bcrypt.compare(password, u.password))) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Enregistrer la date de dernière connexion
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [u.id]);

    const token = jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '1h' });
    res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        surname: u.surname,
        phone: u.phone,
        organization: u.organization
      }
    });
  } catch (err) {
    console.error('Erreur /login :', err);
    res.sendStatus(500);
  }
});

module.exports = router;

// --- RESET PASSWORD ---

// Demande de reset : envoie un lien avec token
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis' });
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
    if (rows.length === 0) {
      // Pour éviter l’enumération, on renvoie 200 même si l’email n’existe pas
      return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
    }
    const userId = rows[0].id;
    const token = jwt.sign({ id: userId }, RESET_SECRET, { expiresIn: '1h' });
    const { sendResetEmail } = require('../utils/mailer');
    await sendResetEmail(email, token);
    res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
  } catch (err) {
    console.error('Erreur /request-reset :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vérifier le token de reset
router.get('/reset/:token', async (req, res) => {
  const { token } = req.params;
  try {
    jwt.verify(token, RESET_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.status(400).json({ valid: false, message: 'Token invalide ou expiré' });
  }
});

// Appliquer le nouveau mot de passe
router.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
  }
  try {
    const decoded = jwt.verify(token, RESET_SECRET);
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, decoded.id]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('Erreur /reset :', err);
    res.status(400).json({ message: 'Token invalide ou expiré' });
  }
});
