import express from 'express';
import pool from '../db.js';
import { sendNotification } from '../services/NotificationService.js';

const router = express.Router();

// GET /need-comments/:needId
router.get('/:needId', async (req, res) => {
  const { needId } = req.params;
  try {
    const result = await pool.query(
      `SELECT nc.*, u.username, u.profile_picture
       FROM need_comments nc
       JOIN users u ON nc.user_id = u.id
       WHERE nc.need_id = $1
       ORDER BY nc.created_at ASC`,
      [needId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching need comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /need-comments
router.post('/', async (req, res) => {
  const { need_id, content } = req.body;
  const user_id = req.user.id;

  if (!need_id || !content) {
    return res.status(400).json({ error: 'need_id and content are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO need_comments (need_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [need_id, user_id, content]
    );

    // Fetch the username for the response
    const commentWithUser = await pool.query(
        `SELECT nc.*, u.username, u.profile_picture, n.name as need_name, n.requestor_user_id
         FROM need_comments nc
         JOIN users u ON nc.user_id = u.id
         JOIN needs n ON nc.need_id = n.id
         WHERE nc.id = $1`,
        [result.rows[0].id]
    );

    const comment = commentWithUser.rows[0];

    // Trigger notification if it's an help offer
    if (content.startsWith('[OFFER]') && comment.requestor_user_id !== user_id) {
      sendNotification(comment.requestor_user_id, {
        message: `New help offer from ${comment.username} for "${comment.need_name}"`,
        type: 'help_offer',
        needId: need_id
      }).catch(err => console.error('Failed to send help offer notification:', err));
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error creating need comment:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

export default router;
