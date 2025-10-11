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
  }
};

module.exports = { logActivity };
