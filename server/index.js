const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors'); // Middleware officiel

const envProdPath = path.resolve(__dirname, '.env.production');
const envDefaultPath = path.resolve(__dirname, '.env');
const envPath = process.env.NODE_ENV === 'production' && fs.existsSync(envProdPath)
  ? envProdPath
  : (fs.existsSync(envDefaultPath) ? envDefaultPath : envProdPath);
require('dotenv').config({ path: envPath });

const app = express(); // DOIT être avant app.use
// redeploy trigger

const defaultDevOrigin = 'http://localhost:5173';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : process.env.NODE_ENV === 'production'
    ? ['https://geo.creates.ngo']
    : [defaultDevOrigin]; // en dev, on limite à l'origine front

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // origines autorisées
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));






const auth = require('./routes/auth');
const data = require('./routes/data');
const users = require('./routes/users');
const customFields = require('./routes/customFields');

app.use('/api/auth', auth);
app.use('/api/data', data);
app.use('/api/users', users);
app.use('/api/custom-fields', customFields);

app.get('/api/version', (req, res) => {
  res.json({
    commit: process.env.SOURCE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || null,
    nodeEnv: process.env.NODE_ENV || null,
  });
});

const distPath = path.resolve(__dirname, '../client/dist');
const shouldServeFrontend = process.env.SERVE_FRONTEND !== 'false';
if (shouldServeFrontend && fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
