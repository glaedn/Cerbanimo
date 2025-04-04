import express from 'express';
import pg from 'pg';
import { Server } from 'socket.io';
import http from 'http';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const router = express.Router();
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const activeUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    activeUsers.set(userId, socket);
  }

  socket.on('disconnect', () => {
    activeUsers.delete(userId);
  });
});

const sendNotification = async (userId, notification) => {
  if (activeUsers.has(userId)) {
    activeUsers.get(userId).emit('notification', notification);
  }
  await pool.query(
    'INSERT INTO notifications (user_id, message, created_at) VALUES ($1, $2, NOW())',
    [userId, notification]
  );
};

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT id, message, created_at, read FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
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
        const { userId, type, message } = req.body;
        const notification = new Notification({ userId, type, message });
        await notification.save();

        // Send real-time update via Socket.IO
        sendNotification(userId, notification);

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

export default router;
