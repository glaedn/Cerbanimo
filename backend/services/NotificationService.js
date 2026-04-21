import pool from '../db.js';

let io;

export const setIo = (socketIo) => {
  io = socketIo;
};

// Function to send notifications
export const sendNotification = async (userId, notification) => {
  const { taskId, message, type } = notification;

  // Check if notification for the same task already exists for the user
  // If taskId is provided, we check for duplicates to avoid spamming the same task update.
  if (taskId) {
    const checkQuery = `
        SELECT * FROM notifications
        WHERE user_id = $1 AND task_id = $2 AND read = false
    `;

    try {
        const existingNotification = await pool.query(checkQuery, [userId, taskId]);

        // If notification exists, skip sending
        if (existingNotification.rows.length > 0) {
            console.log(`Notification for task ${taskId} already exists for user ${userId}. Skipping.`);
            return;  // Skip sending the notification
        }
    } catch (error) {
        console.error('Error checking existing notification:', error);
        // Continue anyway or throw? For now continue to ensure reliability
    }
  }

  try {
      // Store notification in database
      const notificationQuery = `
          INSERT INTO notifications (user_id, task_id, message, type, created_at, read)
          VALUES ($1, $2, $3, $4, NOW(), false)
          RETURNING *
      `;

      const result = await pool.query(notificationQuery, [
          userId,
          taskId || null,
          message,
          type || 'general'
      ]);

      const storedNotification = result.rows[0];

      // Emit to specific user's room if socket.io is available
      if (io) {
        io.to(`user_${userId}`).emit('notification', storedNotification);
        console.log(`Notification sent via socket to user ${userId}`);
      } else {
        console.log(`Notification stored for user ${userId} but socket.io not initialized`);
      }

      return storedNotification;
  } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
  }
};
