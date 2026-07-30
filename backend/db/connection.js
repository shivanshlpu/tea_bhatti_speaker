import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;
let dbPath = null;

/**
 * Initialize the SQLite database using sql.js (WASM-based, no native compilation).
 * Must be called once at startup before any queries.
 * After init, getDb() returns the synchronous database handle.
 */
export async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  dbPath = join(__dirname, '..', '..', 'cafe-voice.db');

  // Load existing database file if it exists
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Apply schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Save to disk after schema application
  saveDb();

  return db;
}

/**
 * Returns the database instance.
 * initDb() must have been called first.
 * @returns {Object} sql.js Database instance
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Save the in-memory database to disk.
 * Call this after write operations to persist changes.
 */
export function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
  }
}

/**
 * Close the database and save to disk.
 */
export function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

/**
 * Helper: Run a query that returns rows (SELECT).
 * Wraps sql.js's low-level API into a familiar pattern.
 * @param {string} sql - SQL query
 * @param {Array} [params=[]] - Bind parameters
 * @returns {Array<Object>} Array of row objects
 */
export function queryAll(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: Run a query that returns a single row.
 * @param {string} sql
 * @param {Array} [params=[]]
 * @returns {Object|null}
 */
export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: Run a write query (INSERT, UPDATE, DELETE).
 * Auto-saves to disk after the operation.
 * @param {string} sql
 * @param {Array} [params=[]]
 * @returns {{ changes: number, lastInsertRowid: number }}
 */
export function runSql(sql, params = []) {
  const database = getDb();
  database.run(sql, params);

  const changes = database.getRowsModified();
  const lastId = queryOne('SELECT last_insert_rowid() as id');

  // Auto-save to disk
  saveDb();

  return {
    changes,
    lastInsertRowid: lastId?.id || 0
  };
}
