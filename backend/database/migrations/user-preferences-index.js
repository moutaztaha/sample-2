import { runStatement } from '../connection.js';

export const createUserPreferencesIndex = async () => {
  try {
    // Create index for user_preferences table if it doesn't exist
    await runStatement(`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user 
      ON user_preferences(user_id)
    `);
    
    console.log('User preferences index created successfully');
  } catch (error) {
    console.error('Error creating user preferences index:', error);
    throw error;
  }
};