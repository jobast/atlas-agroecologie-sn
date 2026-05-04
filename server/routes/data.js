const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { authenticateToken, requireRole, denyReadOnlyRoles, hasRole, normalizeRole } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';
const { sendNewSubmissionAlert } = require('../utils/mailer');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    // Force a safe extension
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    cb(null, `${unique}${safeExt}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Type de fichier non autorisé'), false);
  }
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Extension non autorisée'), false);
  }
  cb(null, true);
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

async function attachChildren(rows) {
  if (!rows || rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const [childRows] = await pool.query(
    'SELECT id, parent_id, initiative, commune, status FROM initiatives WHERE parent_id IN (?)',
    [ids]
  );
  const grouped = {};
  childRows.forEach(c => {
    if (!grouped[c.parent_id]) grouped[c.parent_id] = [];
    grouped[c.parent_id].push({
      id: c.id,
      initiative: c.initiative,
      commune: c.commune,
      status: c.status
    });
  });
  return rows.map(r => ({
    ...r,
    children: grouped[r.id] || [],
    is_programme: (grouped[r.id] || []).length > 0
  }));
}

async function attachParent(rows) {
  if (!rows || rows.length === 0) return rows;
  const parentIds = [...new Set(rows.filter(r => r.parent_id).map(r => r.parent_id))];
  if (parentIds.length === 0) return rows;
  const [parentRows] = await pool.query(
    'SELECT id, initiative FROM initiatives WHERE id IN (?)',
    [parentIds]
  );
  const parentMap = {};
  parentRows.forEach(p => { parentMap[p.id] = { id: p.id, initiative: p.initiative }; });
  return rows.map(r => ({
    ...r,
    parent: r.parent_id ? (parentMap[r.parent_id] || null) : null
  }));
}

async function attachLocations(rows) {
  if (!rows || rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const [locRows] = await pool.query(
    'SELECT id, initiative_id, label, lat, lon, village, commune, is_primary FROM initiative_locations WHERE initiative_id IN (?) ORDER BY is_primary DESC, id ASC',
    [ids]
  );
  const grouped = {};
  locRows.forEach(l => {
    if (!grouped[l.initiative_id]) grouped[l.initiative_id] = [];
    grouped[l.initiative_id].push({
      id: l.id,
      label: l.label,
      lat: l.lat,
      lon: l.lon,
      village: l.village,
      commune: l.commune,
      is_primary: !!l.is_primary
    });
  });
  return rows.map(r => ({ ...r, locations: grouped[r.id] || [] }));
}

// ✅ POST /api/data – Créer une nouvelle initiative
router.post('/', authenticateToken, denyReadOnlyRoles, upload.array('photos', 5), async (req, res) => {
  console.log('POST /api/data — user:', req.user?.id, 'files:', req.files?.length || 0);

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
    location_type,
    contact_email,
    contact_phone,
    person_name,
    website,
    social_media,
    videos,
    extra_fields,
    parent_id,
    bailleurs,
    organisation,
    point_contact,
    duree
  } = req.body;

  // Parse locations array from JSON string
  let locations = [];
  try {
    if (req.body.locations) {
      locations = typeof req.body.locations === 'string'
        ? JSON.parse(req.body.locations)
        : req.body.locations;
    }
  } catch (_) {
    locations = [];
  }

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

    // Validate required fields (defense in depth — client also validates)
    const trimStr = (v) => (typeof v === 'string' ? v.trim() : '');
    const missing = [];
    if (!trimStr(initiative)) missing.push("nom de l'initiative");
    if (!trimStr(description)) missing.push('description');
    if (missing.length) {
      await conn.rollback();
      return res.status(400).json({
        error: `Champs obligatoires manquants : ${missing.join(', ')}.`
      });
    }

    // Validate parent_id if provided. A sub-initiative must live in the same
    // DyTAEL as its parent programme, otherwise it crosses the silo.
    let parentIdInt = null;
    let parentDytaelId = null;
    if (parent_id) {
      parentIdInt = parseInt(parent_id);
      if (Number.isNaN(parentIdInt)) {
        await conn.rollback();
        return res.status(400).json({ error: 'parent_id invalide.' });
      }
      const [parentRows] = await conn.query(
        'SELECT id, dytael_id FROM initiatives WHERE id = ?',
        [parentIdInt]
      );
      if (parentRows.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Programme parent introuvable.' });
      }
      parentDytaelId = parentRows[0].dytael_id;
      if (parentDytaelId != null && req.user.dytael_id != null && parentDytaelId !== req.user.dytael_id) {
        await conn.rollback();
        return res.status(403).json({ error: 'Vous ne pouvez pas ajouter une initiative à un programme situé dans un autre DyTAEL.' });
      }
    }

    const insertSQL = `
      INSERT INTO initiatives (
        initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon, location_type,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields,
        created_at, user_id, dytael_id, parent_id,
        bailleurs, organisation, point_contact, duree, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'pending')
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
    if (yearInt !== null && (yearInt < 1900 || yearInt > 2100)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Année invalide (1900-2100).' });
    }
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!Number.isNaN(latNum) && (latNum < -90 || latNum > 90)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Latitude invalide (-90 à 90).' });
    }
    if (!Number.isNaN(lonNum) && (lonNum < -180 || lonNum > 180)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Longitude invalide (-180 à 180).' });
    }

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

    // dytael_id: a sub-initiative inherits its parent's DyTAEL (canonical source),
    // otherwise it falls back to the submitter's DyTAEL. The body's dytael_id is
    // ignored — DyTAES is read-only and editors are tied to their own DyTAEL.
    let dytaelId = parentDytaelId != null ? parentDytaelId : (req.user.dytael_id || null);

    // Determine effective location_type
    const validTypes = ['point', 'multi', 'zone'];
    const locType = validTypes.includes(location_type) ? location_type : 'point';

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
      locType,
      contact_email,
      contact_phone,
      person_name,
      website,
      JSON.stringify(socialMediaJson),
      videosJson,
      extraFieldsJson,
      userId,
      dytaelId,
      parentIdInt,
      bailleurs || null,
      organisation || null,
      point_contact || null,
      duree || null
    ]);

    const initiativeId = result.insertId;

    // Resolve DyTAEL name for the alert email
    let dytaelName = null;
    if (dytaelId) {
      const [dRows] = await conn.query('SELECT name FROM dytaels WHERE id = ?', [dytaelId]);
      dytaelName = dRows[0]?.name || null;
    }
    await sendNewSubmissionAlert({ name: initiative, dytaelId, dytaelName });

    // Insert locations
    if (locations.length > 0) {
      const insertLocSQL = `INSERT INTO initiative_locations (initiative_id, label, lat, lon, village, commune, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      for (let idx = 0; idx < locations.length; idx++) {
        const loc = locations[idx];
        const locLat = parseFloat(loc.lat);
        const locLon = parseFloat(loc.lon);
        await conn.query(insertLocSQL, [
          initiativeId,
          loc.label || null,
          Number.isNaN(locLat) ? null : locLat,
          Number.isNaN(locLon) ? null : locLon,
          loc.village || null,
          loc.commune || null,
          !!loc.is_primary
        ]);
      }
    } else if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
      // Backward compat: no locations array but lat/lon present → create 1 location
      await conn.query(
        `INSERT INTO initiative_locations (initiative_id, label, lat, lon, village, commune, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [initiativeId, 'Localisation principale', latNum, lonNum, village || null, commune || null, true]
      );
    }

    if (req.files && req.files.length) {
      const insertPhotoSQL = `INSERT INTO photos (initiative_id, filename) VALUES (?, ?)`;
      for (const file of req.files) {
        await conn.query(insertPhotoSQL, [initiativeId, file.filename]);
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Donnée enregistrée', id: initiativeId, parent_id: parentIdInt });
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
        i.actor_type, i.year, i.activities, i.lat, i.lon, i.location_type,
        i.contact_email, i.contact_phone, i.person_name,
        i.website, i.social_media, i.videos, i.extra_fields, i.status,
        i.created_at, i.user_id, i.dytael_id, i.parent_id,
        i.bailleurs, i.organisation, i.point_contact, i.duree
      FROM initiatives i
    `;
    const conditions = [];
    const values = [];

    // By default, public lists only show root initiatives (not sub-initiatives)
    // Pass ?include_children=true to include sub-initiatives
    if (status && !req.query.include_children) {
      conditions.push('i.parent_id IS NULL');
    }

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
    const withLocations = await attachLocations(withPhotos);
    const withChildren = await attachChildren(withLocations);
    const withParent = await attachParent(withChildren);
    res.json(withParent);
  } catch (err) {
    console.error('Erreur GET /api/data:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ DELETE /api/data/:id – suppression (admin DyTAEL ou propriétaire)
// DyTAES bloquée par denyReadOnlyRoles (souveraineté DyTAEL).
router.delete('/:id', authenticateToken, denyReadOnlyRoles, async (req, res) => {
  const { id } = req.params;
  const isAdmin = hasRole(normalizeRole(req.user?.role), 'dytael_admin');

  try {
    let sql, params;
    if (isAdmin) {
      // dytael_admin: only within their own DyTAEL
      sql = 'DELETE FROM initiatives WHERE id = ? AND dytael_id = ?';
      params = [id, req.user.dytael_id];
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

// ✅ PUT /api/data/:id/validate – approuver (DyTAEL admin uniquement, scope DyTAEL)
router.put('/:id/validate', authenticateToken, denyReadOnlyRoles, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE initiatives SET status = ? WHERE id = ? AND dytael_id = ?',
      ['approved', id, req.user.dytael_id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
    res.status(200).json({ message: 'Initiative validée' });
  } catch (err) {
    console.error('Erreur PUT /api/data/:id/validate:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/data/:id/reject – rejeter (DyTAEL admin uniquement, scope DyTAEL)
router.put('/:id/reject', authenticateToken, denyReadOnlyRoles, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE initiatives SET status = ? WHERE id = ? AND dytael_id = ?',
      ['rejected', id, req.user.dytael_id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
    res.status(200).json({ message: 'Initiative rejetée' });
  } catch (err) {
    console.error('Erreur PUT /api/data/:id/reject:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/data/:id/cancel-delete – annuler une demande de suppression (DyTAEL admin)
router.put('/:id/cancel-delete', authenticateToken, denyReadOnlyRoles, requireRole('dytael_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE initiatives SET status = ? WHERE id = ? AND status = ? AND dytael_id = ?',
      ['approved', id, 'delete_requested', req.user.dytael_id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Non autorisé ou initiative introuvable.' });
    }
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
        actor_type, year, activities, lat, lon, location_type,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields, status,
        created_at, user_id, parent_id,
        bailleurs, organisation, point_contact, duree
      FROM initiatives
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    const withPhotos = await attachPhotos(rows, req);
    const withLocations = await attachLocations(withPhotos);
    const withChildren = await attachChildren(withLocations);
    const withParent = await attachParent(withChildren);
    res.json(withParent);
  } catch (err) {
    console.error('Erreur GET /api/data/mine:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/data/:id/request-delete – demande de suppression
router.post('/:id/request-delete', authenticateToken, denyReadOnlyRoles, async (req, res) => {
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

// Try to extract the caller from a Bearer token without forcing auth.
// Returns null if no/invalid token (route stays open to anonymous reads).
function tryDecodeUser(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (_) {
    return null;
  }
}

// True if the caller may see initiatives regardless of status (admins
// of the right scope, or the original submitter).
function canViewAnyStatus(user, initiative) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'dytaes_admin') return true; // national read-only access
  if (role === 'dytael_admin' && initiative.dytael_id === user.dytael_id) return true;
  if (initiative.user_id === user.id) return true;
  return false;
}

// ✅ GET /api/data/:id/children – sous-initiatives d'un programme
router.get('/:id/children', async (req, res) => {
  const { id } = req.params;
  try {
    const user = tryDecodeUser(req);

    // Need the parent's dytael_id to authorize visibility of pending children.
    const [parentRows] = await pool.query(
      'SELECT id, dytael_id FROM initiatives WHERE id = ?',
      [id]
    );
    if (parentRows.length === 0) {
      return res.status(404).json({ error: 'Programme introuvable.' });
    }
    const parent = parentRows[0];

    // Public callers (and editors who don't own the parent) only see approved children.
    const includeAllStatuses = canViewAnyStatus(user, parent);

    let sql = `
      SELECT
        id, initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon, location_type,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields, status,
        created_at, user_id, parent_id,
        bailleurs, organisation, point_contact, duree
      FROM initiatives
      WHERE parent_id = ?
    `;
    const params = [id];
    if (!includeAllStatuses) {
      sql += " AND status = 'approved'";
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);

    const withPhotos = await attachPhotos(rows, req);
    const withLocations = await attachLocations(withPhotos);
    res.json(withLocations);
  } catch (err) {
    console.error("Erreur GET /api/data/:id/children:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ GET /api/data/:id – récupérer une initiative spécifique
// Public callers: approved seulement. Authentifiés: selon scope (admin DyTAEL/DyTAES, ou propriétaire).
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT
        id, initiative, description, village, commune, zone_intervention,
        actor_type, year, activities, lat, lon, location_type,
        contact_email, contact_phone, person_name,
        website, social_media, videos, extra_fields, status,
        created_at, user_id, dytael_id, parent_id,
        bailleurs, organisation, point_contact, duree
      FROM initiatives
      WHERE id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Initiative introuvable" });
    }

    const initiative = rows[0];
    const user = tryDecodeUser(req);
    if (initiative.status !== 'approved' && !canViewAnyStatus(user, initiative)) {
      // Hide existence to anonymous / non-authorized callers.
      return res.status(404).json({ error: "Initiative introuvable" });
    }

    const withPhotos = await attachPhotos(rows, req);
    const withLocations = await attachLocations(withPhotos);
    const withChildren = await attachChildren(withLocations);
    const withParent = await attachParent(withChildren);
    res.json(withParent[0]);
  } catch (err) {
    console.error("Erreur GET /api/data/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ PUT /api/data/:id – modifier une initiative
// Editor: seulement ses propres initiatives. DyTAEL admin: seulement dans son DyTAEL.
// DyTAES bloquée par denyReadOnlyRoles (souveraineté DyTAEL).
router.put('/:id', authenticateToken, denyReadOnlyRoles, async (req, res) => {
  const { id } = req.params;

  // Authorization gate: load the target row and check ownership / DyTAEL scope.
  try {
    const [existingRows] = await pool.query(
      'SELECT id, user_id, dytael_id FROM initiatives WHERE id = ?',
      [id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Initiative introuvable.' });
    }
    const existing = existingRows[0];
    const userRole = normalizeRole(req.user.role);
    const isDytaelAdmin = userRole === 'dytael_admin';
    const isOwner = existing.user_id === req.user.id;
    const sameDytael = existing.dytael_id != null && existing.dytael_id === req.user.dytael_id;
    const allowed = (isDytaelAdmin && sameDytael) || isOwner;
    if (!allowed) {
      return res.status(403).json({ error: "Vous n'avez pas l'autorisation de modifier cette initiative." });
    }
  } catch (err) {
    console.error('Erreur autorisation PUT /api/data/:id:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }

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
    location_type,
    contact_email,
    contact_phone,
    person_name,
    website,
    social_media,
    videos,
    extra_fields,
    parent_id,
    bailleurs,
    organisation,
    point_contact,
    duree
  } = req.body;

  // Parse locations array
  let locations = [];
  try {
    if (req.body.locations) {
      locations = typeof req.body.locations === 'string'
        ? JSON.parse(req.body.locations)
        : req.body.locations;
    }
  } catch (_) {
    locations = [];
  }

  const formattedActivities = Array.isArray(activities)
    ? JSON.stringify(activities)
    : JSON.stringify([activities]);
  const extraFieldsJson = extra_fields
    ? (typeof extra_fields === 'string' ? extra_fields : JSON.stringify(extra_fields))
    : null;

  const validTypes = ['point', 'multi', 'zone'];
  const locType = validTypes.includes(location_type) ? location_type : 'point';

  // Determine primary location for denormalized fields
  let primaryLat = parseFloat(lat);
  let primaryLon = parseFloat(lon);
  let primaryVillage = village;
  let primaryCommune = commune;

  if (locations.length > 0) {
    const primary = locations.find(l => l.is_primary) || locations[0];
    const pLat = parseFloat(primary.lat);
    const pLon = parseFloat(primary.lon);
    if (!Number.isNaN(pLat)) primaryLat = pLat;
    if (!Number.isNaN(pLon)) primaryLon = pLon;
    if (primary.village) primaryVillage = primary.village;
    if (primary.commune) primaryCommune = primary.commune;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Handle parent_id update
    let parentIdValue = undefined; // undefined = don't change
    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === '' || parent_id === 'null') {
        parentIdValue = null;
      } else {
        parentIdValue = parseInt(parent_id);
        if (Number.isNaN(parentIdValue)) parentIdValue = null;
      }
    }

    const updateFields = `
      UPDATE initiatives SET
        initiative = ?, description = ?, village = ?, commune = ?, zone_intervention = ?,
        actor_type = ?, year = ?, activities = ?, lat = ?, lon = ?, location_type = ?,
        contact_email = ?, contact_phone = ?, person_name = ?,
        website = ?, social_media = ?, videos = ?, extra_fields = ?,
        bailleurs = ?, organisation = ?, point_contact = ?, duree = ?
        ${parentIdValue !== undefined ? ', parent_id = ?' : ''}
      WHERE id = ?
    `;

    const updateParams = [
      initiative,
      description,
      primaryVillage,
      primaryCommune,
      zone_intervention,
      actor_type,
      parseInt(year),
      formattedActivities,
      Number.isNaN(primaryLat) ? null : primaryLat,
      Number.isNaN(primaryLon) ? null : primaryLon,
      locType,
      contact_email,
      contact_phone,
      person_name,
      website,
      social_media,
      videos,
      extraFieldsJson,
      bailleurs || null,
      organisation || null,
      point_contact || null,
      duree || null,
    ];
    if (parentIdValue !== undefined) updateParams.push(parentIdValue);
    updateParams.push(id);

    const [result] = await conn.query(updateFields, updateParams);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Initiative non trouvée pour mise à jour" });
    }

    // Replace locations: delete existing, re-insert
    await conn.query('DELETE FROM initiative_locations WHERE initiative_id = ?', [id]);

    if (locations.length > 0) {
      const insertLocSQL = `INSERT INTO initiative_locations (initiative_id, label, lat, lon, village, commune, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      for (let idx = 0; idx < locations.length; idx++) {
        const loc = locations[idx];
        const locLat = parseFloat(loc.lat);
        const locLon = parseFloat(loc.lon);
        await conn.query(insertLocSQL, [
          id,
          loc.label || null,
          Number.isNaN(locLat) ? null : locLat,
          Number.isNaN(locLon) ? null : locLon,
          loc.village || null,
          loc.commune || null,
          !!loc.is_primary
        ]);
      }
    } else if (!Number.isNaN(primaryLat) && !Number.isNaN(primaryLon)) {
      // Backward compat: no locations array but lat/lon present
      await conn.query(
        `INSERT INTO initiative_locations (initiative_id, label, lat, lon, village, commune, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, 'Localisation principale', primaryLat, primaryLon, primaryVillage || null, primaryCommune || null, true]
      );
    }

    await conn.commit();
    res.json({ message: "Initiative mise à jour" });
  } catch (err) {
    await conn.rollback();
    console.error("Erreur PUT /api/data/:id :", err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    conn.release();
  }
});
module.exports = router;
