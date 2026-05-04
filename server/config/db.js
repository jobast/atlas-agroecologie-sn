// PostgreSQL pool with a thin mysql2-compatible wrapper.
// The route code was originally written against mysql2/promise; this wrapper
// keeps that call shape so the migration is a swap rather than a rewrite.
//
// Compatibility points:
//   - `?` placeholders are rewritten to PG's `$1, $2, ...` form.
//   - SELECT  -> returns [rows, fields] (rows is an array of records).
//   - INSERT  -> returns [{ insertId, affectedRows }, fields]; INSERTs that
//     don't already have a RETURNING clause get `RETURNING id` appended so
//     callers can keep reading `result.insertId`.
//   - UPDATE/DELETE -> returns [{ affectedRows }, fields].
//   - getConnection() returns a wrapper that exposes beginTransaction/commit/
//     rollback/release/query like mysql2.

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envProdPath = path.resolve(__dirname, '../.env.production');
const envDefaultPath = path.resolve(__dirname, '../.env');
const envPath = process.env.NODE_ENV === 'production' && fs.existsSync(envProdPath)
  ? envProdPath
  : (fs.existsSync(envDefaultPath) ? envDefaultPath : envProdPath);
dotenv.config({ path: envPath });

const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 10,
});

function translateSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

function isInsertWithoutReturning(sql) {
  const t = sql.trim();
  return /^INSERT\b/i.test(t) && !/RETURNING\b/i.test(t);
}

function appendReturningId(sql) {
  return sql.replace(/;\s*$/, '') + ' RETURNING id';
}

async function compatQuery(executor, sql, params = []) {
  const isSelect = /^\s*SELECT\b/i.test(sql);
  const wantsReturning = isInsertWithoutReturning(sql);
  const finalSql = translateSql(wantsReturning ? appendReturningId(sql) : sql);
  const result = await executor.query(finalSql, params);

  const fields = result.fields || [];
  if (isSelect) {
    return [result.rows || [], fields];
  }
  const meta = {
    affectedRows: result.rowCount || 0,
    rowCount: result.rowCount || 0,
    insertId: wantsReturning && result.rows && result.rows[0] ? result.rows[0].id : 0,
  };
  return [meta, fields];
}

const pool = {
  query: (sql, params) => compatQuery(pgPool, sql, params),

  async getConnection() {
    const client = await pgPool.connect();
    let released = false;
    return {
      query: (sql, params) => compatQuery(client, sql, params),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => {
        if (released) return;
        released = true;
        client.release();
      },
    };
  },

  end: () => pgPool.end(),
};

module.exports = pool;
