/**
 * Import Mbour survey CSV data into the initiatives table.
 *
 * Usage:
 *   node server/migrations/import_mbour_csv.js
 *
 * Prerequisites:
 *   - 001_multi_tenant.sql must have been run first (dytaels table exists with Mbour row)
 *   - The CSV file path is hardcoded below; adjust if needed
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const csv = require('csv-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CSV_PATH = path.resolve(__dirname, '../../exports/survey_mbour.csv');
// Fallback to the original location if the copy doesn't exist
const CSV_FALLBACK = '/Users/saidimu/Downloads/00_A_Trier/survey_0.csv';

// ── Column mapping ──────────────────────────────────────────────────────────

function parseActivities(row) {
  const main = (row['Maillon chaine de valeur ou activité'] || '').trim();
  const other = (row['Other - Maillon chaine de valeur ou activité'] || '').trim();
  const parts = main
    ? main.split(',').map((s) => s.trim().replace(/_/g, ' ')).filter(Boolean)
    : [];
  if (other) parts.push(other);
  return parts;
}

function parseSocialMedia(row) {
  const raw = (row['Réseaux sociaux'] || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => {
    const name = s.trim().replace(/_/g, ' ');
    return { platform: name, url: '' };
  }).filter((s) => s.platform);
}

function parseYear(raw) {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function parseCoord(raw) {
  if (!raw) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function buildDescription(row) {
  const parts = [];
  const profession = (row['Profession'] || '').trim();
  if (profession) parts.push(`Profession : ${profession}`);
  const lien = (row["Lien avec l'agroécologie"] || '').trim();
  if (lien) parts.push(`Lien avec l'agroécologie : ${lien}`);
  const comment = (row['Commentaire écrit'] || '').trim();
  if (comment) parts.push(comment);
  return parts.join('\n\n') || 'Initiative agroécologique';
}

function buildExtraFields(row) {
  const extras = {};

  const mapping = {
    'enqueteur': 'Enquêteur',
    'age': 'Age',
    'sexe': 'Sexe',
    'lieux_residence': 'Lieux de résidence',
    'profession': 'Profession',
    'autre_type_acteur': 'Autre - Type d\'acteur',
    'type_groupement': 'Type de groupement',
    'organisation': 'Organisation',
    'autre_organisation': 'Autre - Organisation',
    'niveau_gouvernement': 'Niveau Gouvernement',
    'agence_gouvernementale': 'Agence gouvernementale',
    'type_culture': 'Type de culture',
    'production_agricole': 'Production Agricole',
    'autre_production_agricole': 'Autre - Production Agricole',
    'principales_speculations': 'Principales spéculations',
    'pratiques_agroecologiques': 'Pratiques agroécologiques',
    'autre_pratiques_agroecologiques': 'Autre - Pratiques agroécologiques',
    'production_animale': 'Production Animale',
    'autre_production_animale': 'Autre (préciser) - Production Animale',
    'production_intrants': 'Production Intrants',
    'autre_production_intrants': 'Autre - Production Intrants',
    'activites_logistiques': 'Précisez les activités logistiques',
    'activites_commercialisation': 'Précisez les activités - Commercialisation',
    'activites_transformation': 'Précisez les activités de transformation',
    'activites_plaidoyer': 'Précisez les activités de plaidoyer',
    'activites_formation': 'Précisez les activités - Formation',
    'activites_appui_technique': 'Précisez les activités - Appui technique',
    'activites_autre': 'Précisez les activités - Autre',
    'taille_exploitation': "Taille de l'exploitation",
    'taille_exploitation_mise_en_valeur': "Taille de l'exploitation mise en valeur (si différente)",
    'type_propriete_fonciere': 'Type de propriété foncière',
    'nombre_employes': "Nombre total d'employés",
    'nombre_femmes': 'Nombre de femmes',
    'nombre_jeunes': 'Nombre de jeunes',
    'budget_annuel': 'Estimation du budget annuel',
    'membre_dytaes': 'DyTAES',
    'membre_dytael': 'DyTAEL',
    'plateforme_gouvernance_fonciere': 'Plateforme Gouvernance Foncière',
    'membre_fongs': 'FONGS',
    'membre_cncr': 'CNCR',
    'membre_fenab': 'FENAB',
    'membre_racines': 'RACINES',
    'autre_dynamique_multiacteurs': 'Autre dynamique multi-acteurs',
    'soutiens_techniques_financiers': 'Soutiens techniques et financiers',
    'besoins_attentes': 'Besoins et attentes pour faciliter la transition agroecologique',
    'lien_agroecologie': "Lien avec l'agroécologie",
    'commentaire': 'Commentaire écrit',
  };

  for (const [key, csvCol] of Object.entries(mapping)) {
    const val = (row[csvCol] || '').trim();
    if (val) extras[key] = val;
  }

  // Store original survey ID for traceability
  if (row['GlobalID']) extras['survey_global_id'] = row['GlobalID'];

  return Object.keys(extras).length > 0 ? extras : null;
}

function mapRow(row) {
  const initiative = (row["Nom de l'initiative"] || '').trim();
  if (!initiative) return null;

  // Skip test rows
  if (/^test\d*$/i.test(initiative)) return null;

  const lon = parseCoord(row['x']);
  const lat = parseCoord(row['y']);
  if (lon === null || lat === null) return null;

  return {
    initiative,
    description: buildDescription(row),
    village: (row["Lieu de l'initiative (village)"] || '').trim() || null,
    commune: (row["Lieu de l'initiative (commune)"] || '').trim() || null,
    zone_intervention: null,
    actor_type: (row["Type d'acteur"] || '').trim().replace(/_/g, ' ') || null,
    year: parseYear(row["Année de début de l'initiative"]),
    activities: parseActivities(row),
    lat,
    lon,
    contact_email: (row['Email 1'] || '').trim() || null,
    contact_phone: (row['Numéro de téléphone 1'] || '').trim() || null,
    person_name: (row['Nom de la personne interrogée'] || '').trim() || null,
    website: (row['Site Internet'] || '').trim() || null,
    social_media: parseSocialMedia(row),
    videos: [],
    extra_fields: buildExtraFields(row),
    status: 'approved',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = fs.existsSync(CSV_PATH) ? CSV_PATH : CSV_FALLBACK;
  console.log(`Reading CSV from: ${csvPath}`);

  // Read CSV
  const rows = await new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath, { encoding: 'utf-8' })
      .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '') }))
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });

  console.log(`Total CSV rows: ${rows.length}`);

  const mapped = rows.map(mapRow).filter(Boolean);
  console.log(`Valid rows (excluding test): ${mapped.length}`);

  // Connect to DB
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  // Get Mbour dytael_id
  const [dytaelRows] = await connection.execute(
    "SELECT id FROM dytaels WHERE slug = 'mbour'"
  );
  if (dytaelRows.length === 0) {
    console.error('ERROR: Mbour DyTAEL not found. Run 001_multi_tenant.sql first.');
    process.exit(1);
  }
  const mbourId = dytaelRows[0].id;
  console.log(`Mbour dytael_id: ${mbourId}`);

  // Insert initiatives
  const sql = `INSERT INTO initiatives
    (initiative, description, village, commune, zone_intervention, actor_type,
     year, activities, lat, lon, contact_email, contact_phone, person_name,
     website, social_media, videos, extra_fields, status, dytael_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

  let inserted = 0;
  let errors = 0;

  for (const item of mapped) {
    try {
      await connection.execute(sql, [
        item.initiative,
        item.description,
        item.village,
        item.commune,
        item.zone_intervention,
        item.actor_type,
        item.year,
        JSON.stringify(item.activities),
        item.lat,
        item.lon,
        item.contact_email,
        item.contact_phone,
        item.person_name,
        item.website,
        JSON.stringify(item.social_media),
        JSON.stringify(item.videos),
        item.extra_fields ? JSON.stringify(item.extra_fields) : null,
        item.status,
        mbourId,
      ]);
      inserted++;
    } catch (err) {
      errors++;
      console.error(`Error inserting "${item.initiative}":`, err.message);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Errors: ${errors}`);
  await connection.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
