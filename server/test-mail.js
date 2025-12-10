const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envProdPath = path.resolve(__dirname, '.env.production');
const envDefaultPath = path.resolve(__dirname, '.env');
const envPath = process.env.NODE_ENV === 'production' && fs.existsSync(envProdPath)
  ? envProdPath
  : (fs.existsSync(envDefaultPath) ? envDefaultPath : envProdPath);
dotenv.config({ path: envPath });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // pour STARTTLS (port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: `GeoCollect <${process.env.SMTP_USER}>`,
  to: process.env.ADMIN_EMAIL,
  subject: '✅ Test Email de GeoCollect',
  text: 'Bravo, ça fonctionne !'
})
.then(() => console.log('✅ Email envoyé avec succès !'))
.catch(err => console.error('❌ Erreur lors de l\'envoi :', err));
