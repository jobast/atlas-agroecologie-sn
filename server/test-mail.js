require('dotenv').config();
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
