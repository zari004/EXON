const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/exon.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('📊 Connected to SQLite database');
});

// Run query with promise
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Get single row
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Get all rows
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize database schema
const init = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Leads table
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          score INTEGER NOT NULL,
          segment TEXT NOT NULL,
          q1 INTEGER,
          q2 INTEGER,
          q3 INTEGER,
          q4 INTEGER,
          q5 INTEGER,
          q6 INTEGER,
          q7 INTEGER,
          q8 INTEGER,
          q9 INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          telegram_sent BOOLEAN DEFAULT 0,
          consultation_booked BOOLEAN DEFAULT 0
        )
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Leads table ready');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  run,
  get,
  all,
  init
};
