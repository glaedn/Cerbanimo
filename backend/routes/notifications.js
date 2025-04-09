import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const router = express.Router();

// Get notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching notifications for userId: ${userId}`);
    
    const result = await pool.query(
      'SELECT id, message, type, created_at, read FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    console.log(`Found ${result.rows.length} notifications for user ${userId}`);
    
    // Structure the response to match what the frontend expects
    res.json({ 
      notifications: result.rows 
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = ANY($1)',
      [notificationIds]
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { userId, message, type = 'general' } = req.body;
    
    // Insert the notification in the database
    const insertResult = await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at, read) VALUES ($1, $2, $3, NOW(), false) RETURNING *',
      [userId, message, type]
    );
    

    res.status(201).json({ 
      success: true,
      notification: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;