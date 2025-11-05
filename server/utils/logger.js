<<<<<<< HEAD
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
=======
const { supabase } = require('../config/database');

const logActivity = async (userId, action, entityType, entityId, details = {}) => {
  try {
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      });
  } catch (error) {
    console.error('Error logging activity:', error);
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
  }
};

module.exports = { logActivity };
