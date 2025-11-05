<<<<<<< HEAD
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Ensure /data directory exists
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Initialize SQLite database
const dbFile = path.join(dbDir, 'database.db');
const db = new Database(dbFile);

// === USERS TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    level TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).run();

// Trigger to auto-update updated_at
db.prepare(`
  CREATE TRIGGER IF NOT EXISTS users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
  END;
`).run();

// === STUDENT–SUPERVISOR ASSIGNMENTS TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS student_supervisor_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    supervisor_id INTEGER NOT NULL,
    level_coordinator_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id),
    FOREIGN KEY (level_coordinator_id) REFERENCES users(id)
  )
`).run();

// === REPORTS TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    supervisor_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    report_stage TEXT CHECK(report_stage IN ('progress_1','progress_2','progress_3','final')) DEFAULT 'progress_1',
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending',
    version INTEGER DEFAULT 1,
    submitted_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  )
`).run();

// === FEEDBACK TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    supervisor_id INTEGER NOT NULL,
    comment TEXT,
    action_taken TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  )
`).run();

// === HOD FEEDBACK TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS hod_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    hod_id INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (hod_id) REFERENCES users(id)
  )
`).run();

// === ACTIVITY LOGS TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

console.log('✅ SQLite database initialized successfully.');

module.exports = db;
=======
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
