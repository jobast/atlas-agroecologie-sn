const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { authenticateToken, requireRole, hasRole, normalizeRole } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';
const { sendNewSubmissionAlert } = require('../utils/mailer');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Invalid file type'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

const buildPhotoUrl = (filename, req) => {
  const base = process.env.PUBLIC_FILES_URL || `${req.protocol}://${req.headers.host}`;
  return `${base}/uploads/photos/${filename}`;
};

async function attachPhotos(rows, req) {
  if (!rows || rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const [photoRows] = await pool.query(
    'SELECT initiative_id, filename FROM photos WHERE initiative_id IN (?)',
    [ids]
  );
  const grouped = {};
  photoRows.forEach(p => {
    if (!grouped[p.initiative_id]) grouped[p.initiative_id] = [];
    grouped[p.initiative_id].push(buildPhotoUrl(p.filename, req));
  });
  return rows.map(r => ({ ...r, photos: grouped[r.id] || [] }));
}

// ✅ POST /api/data – Créer une nouvelle initiative
router.post('/', authenticateToken, upload.array('photos', 5), async (req, res) => {
  console.log('––– 📩 Nouvelle requête POST /api/data –––');
  console.log('✅ Champs reçus :', req.body);
  console.log('📎 Fichiers reçus :', req.files);

  const {
    initiative,
    description,
    village,
    commune,
    zone_intervention,
    actor_type,
    year,
    lat,
    lon,
    contact_email,
    contact_phone,
    person_name,
    website,
    social_media,
    videos,
    extra_fields
  } = req.body;

  let activities = req.body.activities;
  if (!Array.isArray(activities)) {
    activities = activities ? [activities] : [];
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const safeArray = (input) => {
      if (Array.isArray(input)) return input;
      if (typeof input === 'string' && input.trim().length) return [input];
      return [];
    };

    const insertSQL = `
      INSERT INTO initiatives (
        initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields,
        created_at, user_id, dytael_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'pending')
    `;

    // Normaliser les champs JSON/array
    const activitiesJson = JSON.stringify(safeArray(activities));
    let socialMediaJson = null;
    try {
      socialMediaJson = social_media ? JSON.parse(social_media) : [];
    } catch (_) {
      socialMediaJson = [];
    }
    const videosJson = JSON.stringify(safeArray(videos));
    let extraFieldsJson = null;
    try {
      extraFieldsJson = extra_fields ? JSON.stringify(JSON.parse(extra_fields)) : null;
    } catch (_) {
      extraFieldsJson = null;
    }

    const yearInt = Number.isNaN(parseInt(year)) ? null : parseInt(year);
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Vérifier que l'utilisateur existe encore, sinon refuser la requête
    let userId = req.user?.id || null;
    if (!userId) {
      await conn.rollback();
      return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    }
    const [uRows] = await conn.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (uRows.length === 0) {
      await conn.rollback();
      return res.status(403).json({ error: 'Utilisateur inconnu.' });
    }

    // dytael_id: dytaes_admin can specify explicitly, others use their own
    const userRole = normalizeRole(req.user.role);
    let dytaelId = req.user.dytael_id || null;
    if (userRole === 'dytaes_admin' && req.body.dytael_id) {
      dytaelId = parseInt(req.body.dytael_id);
    }

    const [result] = await conn.query(insertSQL, [
      initiative,
      description,
      village,
      commune,
      zone_intervention,
      actor_type,
      yearInt,
      activitiesJson,
      Number.isNaN(latNum) ? null : latNum,
      Number.isNaN(lonNum) ? null : lonNum,
      contact_email,
      contact_phone,
      person_name,
      website,
      JSON.stringify(socialMediaJson),
      videosJson,
      extraFieldsJson,
      userId,
      dytaelId
    ]);

    const initiativeId = result.insertId;
    await sendNewSubmissionAlert(initiative);

    if (req.files && req.files.length) {
      const insertPhotoSQL = `INSERT INTO photos (initiative_id, filename) VALUES (?, ?)`;
      for (const file of req.files) {
        await conn.query(insertPhotoSQL, [initiativeId, file.filename]);
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Donnée enregistrée', id: initiativeId });
  } catch (err) {
    await conn.rollback();
    console.error('💥 Erreur lors de l’insertion :', err);
    res.status(500).json({ error: 'Erreur serveur : insertion échouée.' });
  } finally {
    conn.release();
  }
});

// ✅ GET /api/data – avec filtre facultatif ?status=pending
// Public pour status=approved, sinon réservé aux admins (token requis).
router.get('/', async (req, res) => {
  const { status, dytael_id } = req.query;
  try {
    let user = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (token) {
      try {
        user = jwt.verify(token, SECRET);
      } catch (_) {
        // ignore token errors for public access to approved
      }
    }

    let query = `
      SELECT
        i.id, i.initiative, i.description, i.village, i.commune, i.zone_intervention,
        i.actor_type, i.year, i.activities, i.lat, i.lon,
        i.contact_email, i.contact_phone, i.person_name,
        i.website, i.social_media, i.videos, i.extra_fields, i.status,
        i.created_at, i.user_id, i.dytael_id
      FROM initiatives i
    `;
    const conditions = [];
    const values = [];

    if (status) {
      conditions.push('i.status = ?');
      values.push(status);
    } else {
      // no status filter => admin access required
      if (!user || !hasRole(normalizeRole(user.role), 'dytael_admin')) {
        return res.status(403).json({ error: 'Accès restreint' });
      }
    }

    // DyTAEL scoping
    if (dytael_id) {
      conditions.push('i.dytael_id = ?');
      values.push(parseInt(dytael_id));
    } else if (user && !status) {
      // Admin without explicit dytael_id filter: scope dytael_admin to their DyTAEL
      const userRole = normalizeRole(user.role);
      if (userRole === 'dytael_admin' && user.dytael_id) {
        conditions.push('i.dytael_id = ?');
        values.push(user.dytael_id);
      }
      // dytaes_admin sees all
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await pool.query(query, values);
    const withPhotos = await attachPhotos(rows, req);
    res.json(withPhotos);
  } catch (err) {
    console.error('Erreur GET /api/data:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ DELETE /api/data/:id – suppression (admin ou propriétaire)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isAdmin = hasRole(normalizeRole(req.user?.role), 'dytael_admin');

  try {
    let sql, params;
    if (isAdmin) {
      // dytael_admin: can only delete within their DyTAEL; dytaes_admin: can delete any
      const isDytaes = normalizeRole(req.user.role) === 'dytaes_admin';
      if (isDytaes) {
        sql = 'DELETE FROM initiatives WHERE id = ?';
        params = [id];
      } else {
        sql = 'DELETE FROM initiatives WHERE id = ? AND dytael_id = ?';
        params = [id, req.user.dytael_id];
      }
    } else {
      sql = 'DELETE FROM initiatives WHERE id = ? AND user_id = ?';
      params = [id, req.user.id];
    }

    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }

    res.json({ message: 'Initiative supprimée.' });
  } catch (err) {
    console.error('Erreur DELETE /api/data/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/data/:id/validate – approuver une initiative (admin)
router.put('/:id/validate', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const userRole = normalizeRole(req.user.role);
    let sql, params;
    if (userRole === 'dytaes_admin') {
      sql = 'UPDATE initiatives SET status = ? WHERE id = ?';
      params = ['approved', id];
    } else {
      sql = 'UPDATE initiatives SET status = ? WHERE id = ? AND dytael_id = ?';
      params = ['approved', id, req.user.dytael_id];
    }
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
    res.status(200).json({ message: 'Initiative validée' });
  } catch (err) {
    console.error('Erreur PUT /api/data/:id/validate:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/data/:id/reject – rejeter une initiative (admin)
router.put('/:id/reject', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const userRole = normalizeRole(req.user.role);
    let sql, params;
    if (userRole === 'dytaes_admin') {
      sql = 'UPDATE initiatives SET status = ? WHERE id = ?';
      params = ['rejected', id];
    } else {
      sql = 'UPDATE initiatives SET status = ? WHERE id = ? AND dytael_id = ?';
      params = ['rejected', id, req.user.dytael_id];
    }
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
    res.status(200).json({ message: 'Initiative rejetée' });
  } catch (err) {
    console.error('Erreur PUT /api/data/:id/reject:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/data/:id/cancel-delete – annuler une demande de suppression (admin)
router.put('/:id/cancel-delete', authenticateToken, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE initiatives SET status = ? WHERE id = ? AND status = ?',
      ['approved', id, 'delete_requested']
    );
    res.json({ message: 'Demande de suppression annulée.' });
  } catch (err) {
    console.error('Erreur PUT /api/data/:id/cancel-delete:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/data/mine – initiatives de l'utilisateur connecté
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id, initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields, status,
        created_at, user_id
      FROM initiatives
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    const withPhotos = await attachPhotos(rows, req);
    res.json(withPhotos);
  } catch (err) {
    console.error('Erreur GET /api/data/mine:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/data/:id/request-delete – demande de suppression
router.post('/:id/request-delete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE initiatives SET status = ? WHERE id = ? AND user_id = ?',
      ['delete_requested', id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
    res.json({ message: 'Demande de suppression enregistrée.' });
  } catch (err) {
    console.error('Erreur POST /api/data/:id/request-delete:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/data/:id – récupérer une initiative spécifique
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT
        id, initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields, status,
        created_at, user_id
      FROM initiatives
      WHERE id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Initiative introuvable" });
    }

    const withPhotos = await attachPhotos(rows, req);
    res.json(withPhotos[0]);
  } catch (err) {
    console.error("Erreur GET /api/data/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ PUT /api/data/:id – modifier une initiative
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    initiative,
    description,
    village,
    commune,
    zone_intervention,
    actor_type,
    year,
    activities,
    lat,
    lon,
    contact_email,
    contact_phone,
    person_name,
    website,
    social_media,
    videos,
    extra_fields
  } = req.body;

    const formattedActivities = Array.isArray(activities)
    ? JSON.stringify(activities)
    : JSON.stringify([activities]);
  const extraFieldsJson = extra_fields
    ? (typeof extra_fields === 'string' ? extra_fields : JSON.stringify(extra_fields))
    : null;

  try {
    const [result] = await pool.query(`
      UPDATE initiatives SET
        initiative = ?, description = ?, village = ?, commune = ?, zone_intervention = ?,
        actor_type = ?, year = ?, activities = ?, lat = ?, lon = ?,
        contact_email = ?, contact_phone = ?, person_name = ?,
        website = ?, social_media = ?, videos = ?, extra_fields = ?
      WHERE id = ?
    `, [
      initiative,
      description,
      village,
      commune,
      zone_intervention,
      actor_type,
      parseInt(year),
      formattedActivities,
      parseFloat(lat),
      parseFloat(lon),
      contact_email,
      contact_phone,
      person_name,
      website,
      social_media,
      videos,
      extraFieldsJson,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Initiative non trouvée pour mise à jour" });
    }

    res.json({ message: "Initiative mise à jour" });
  } catch (err) {
    console.error("Erreur PUT /api/data/:id :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
module.exports = router;
