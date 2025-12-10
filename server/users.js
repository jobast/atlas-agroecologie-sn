const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  const r = await pool.query(`
    SELECT id, email, role, name, surname, phone, created_at, last_login 
    FROM users
  `);
  res.json(r.rows);
});

router.put('/:id', async (req, res) => {
  const { role, name, surname, phone, email, organization } = req.body;
  await pool.query(
    'UPDATE users SET role = $1, name = $2, surname = $3, phone = $4, email = $5, organization = $6 WHERE id = $7',
    [role, name, surname, phone, email, organization, req.params.id]
  );
  res.sendStatus(200);
});

module.exports = router;
