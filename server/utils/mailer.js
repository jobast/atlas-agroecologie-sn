const nodemailer = require('nodemailer');
const pool = require('../config/db');

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Resolve recipients for a new-submission alert.
// Always CCs every confirmed super_admin (platform-wide oversight), plus the
// dytael_admins of the target DyTAEL. Falls back to ADMIN_EMAIL only if both
// lookups come back empty (e.g. bootstrap, fresh DyTAEL with no admins yet).
async function resolveSubmissionRecipients(dytaelId) {
  const fallback = process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : [];
  const recipients = new Set();
  try {
    const [superRows] = await pool.query(
      `SELECT email FROM users WHERE role = 'super_admin' AND confirmed = 1`
    );
    superRows.forEach(r => r.email && recipients.add(r.email));
    if (dytaelId) {
      const [rows] = await pool.query(
        `SELECT email FROM users
         WHERE dytael_id = ? AND role IN ('dytael_admin', 'admin') AND confirmed = 1`,
        [dytaelId]
      );
      rows.forEach(r => r.email && recipients.add(r.email));
    }
  } catch (e) {
    console.error('resolveSubmissionRecipients lookup failed:', e);
  }
  return recipients.size > 0 ? [...recipients] : fallback;
}

// initiative: { name, dytaelId, dytaelName }
async function sendNewSubmissionAlert(initiative) {
  const name = typeof initiative === 'string' ? initiative : initiative?.name;
  const dytaelId = typeof initiative === 'object' ? initiative?.dytaelId : null;
  const dytaelName = typeof initiative === 'object' ? initiative?.dytaelName : null;

  const recipients = await resolveSubmissionRecipients(dytaelId);
  if (recipients.length === 0) {
    console.warn('sendNewSubmissionAlert: no recipient resolved, skipping');
    return;
  }

  const subjectScope = dytaelName ? ` (${dytaelName})` : '';
  const bodyScope = dytaelName ? `\n\nDyTAEL : ${dytaelName}` : '';

  try {
    await t.sendMail({
      from: `GeoCollect <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: `Nouvelle initiative soumise${subjectScope}`,
      text: `Une nouvelle initiative a été soumise : ${name}${bodyScope}\n\nElle attend votre validation dans le tableau de bord.`,
    });
  } catch (e) {
    console.error(e);
  }
}

async function sendConfirmationEmail(email, token) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const confirmationUrl = `${frontendBase}/confirm-email/${token}`;
  console.log("✉️ Envoi de l’email de confirmation à :", email);
  console.log("🔗 Lien de confirmation :", confirmationUrl);
  try {
    await t.sendMail({
      from: `GeoCollect <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Confirmez votre inscription',
      text: `Merci pour votre inscription.\n\nVeuillez confirmer votre adresse en cliquant sur ce lien :\n${confirmationUrl}\n\nSi le lien ne fonctionne pas, copiez-collez-le dans votre navigateur.`
    });
  } catch (e) {
    console.error("❌ Erreur d’envoi d’email de confirmation :", e);
  }
}

async function sendResetEmail(email, token) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendBase}/reset-password/${token}`;
  try {
    await t.sendMail({
      from: `GeoCollect <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      text: `Pour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetUrl}`
    });
  } catch (e) {
    console.error("❌ Erreur d’envoi d’email de reset :", e);
  }
}

module.exports = {
  sendNewSubmissionAlert,
  sendConfirmationEmail,
  sendResetEmail
};
