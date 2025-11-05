const db = require('../config/database');

const logActivity = (user_id, action, entity_type = null, entity_id = null, details = {}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(user_id, action, entity_type, entity_id, JSON.stringify(details));
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

module.exports = { logActivity };
