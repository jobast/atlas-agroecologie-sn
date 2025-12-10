const nodemailer = require('nodemailer');

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendNewSubmissionAlert(name) {
  try {
    await t.sendMail({
      from: `GeoCollect <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Nouvelle initiative soumise',
      text: `Une nouvelle initiative a été soumise : ${name}`,
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
