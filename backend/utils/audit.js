import { runStatement } from '../database/connection.js';

export const logAuditTrail = async (tableName, recordId, action, oldValues, newValues, userId) => {
  try {
    await runStatement(`
      INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      tableName,
      recordId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      userId
    ]);
  } catch (error) {
    console.error('Error logging audit trail:', error);
  }
};

export const getAuditTrail = async (tableName, recordId) => {
  try {
    const trail = await runQuery(`
      SELECT 
        a.*,
        u.username
      FROM audit_trail a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.table_name = ? AND a.record_id = ?
      ORDER BY a.timestamp DESC
    `, [tableName, recordId]);

    return trail;
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
};