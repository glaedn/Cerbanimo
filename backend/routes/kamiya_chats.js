import express from 'express';
import pool from '../db.js';

const router = express.Router();
const maxChats = 50;
const maxMessages = 240;

router.get('/chats', async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const result = await pool.query('SELECT kamiya_chats FROM users WHERE id = $1', [userId]);
    const chats = normalizeChats(result.rows[0]?.kamiya_chats, userId);

    res.json({
      chats: chats
        .map(({ id, name, createdAt, updatedAt, messages }) => ({
          id,
          name,
          createdAt,
          updatedAt,
          messageCount: Array.isArray(messages) ? messages.length : 0
        }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    });
  } catch (error) {
    console.error('Failed to list Kamiya chats:', error);
    res.status(500).json({ message: 'Failed to list Kamiya chats' });
  }
});

router.get('/chats/:chatId', async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const result = await pool.query('SELECT kamiya_chats FROM users WHERE id = $1', [userId]);
    const chats = normalizeChats(result.rows[0]?.kamiya_chats, userId);
    const chat = chats.find((item) => String(item.id) === String(req.params.chatId));

    if (!chat) return res.status(404).json({ message: 'Kamiya chat not found' });
    res.json({ chat });
  } catch (error) {
    console.error('Failed to load Kamiya chat:', error);
    res.status(500).json({ message: 'Failed to load Kamiya chat' });
  }
});

router.post('/chats', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    await client.query('BEGIN');
    const result = await client.query('SELECT kamiya_chats, kamiya_chat_seq FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    const now = new Date().toISOString();
    const chats = normalizeChats(row.kamiya_chats, userId);
    let nextSeq = Number(row.kamiya_chat_seq || 0);
    const requestedId = req.body.chatId ?? req.body.id;
    let chat = requestedId ? chats.find((item) => String(item.id) === String(requestedId)) : undefined;

    if (!chat) {
      nextSeq += 1;
      chat = {
        id: nextSeq,
        userId,
        createdAt: now,
        updatedAt: now,
        name: sanitizeName(req.body.name),
        messages: [],
        session: {}
      };
      chats.push(chat);
    }

    chat.userId = userId;
    chat.name = sanitizeName(req.body.name || chat.name);
    chat.messages = sanitizeMessages(req.body.messages);
    chat.session = sanitizeSession(req.body.session);
    chat.updatedAt = now;

    const orderedChats = chats
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, maxChats);

    await client.query(
      'UPDATE users SET kamiya_chats = $1::jsonb, kamiya_chat_seq = $2 WHERE id = $3',
      [JSON.stringify(orderedChats), nextSeq, userId]
    );
    await client.query('COMMIT');

    res.status(chat.createdAt === now && !requestedId ? 201 : 200).json({ chat });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to save Kamiya chat:', error);
    res.status(500).json({ message: 'Failed to save Kamiya chat' });
  } finally {
    client.release();
  }
});

function requireUserId(req, res) {
  if (!req.user?.id) {
    res.status(401).json({ message: 'Authenticated Cerbanimo user required' });
    return undefined;
  }
  return req.user.id;
}

function normalizeChats(value, userId) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((chat) => chat && typeof chat === 'object')
    .map((chat) => ({
      id: chat.id,
      userId: chat.userId || userId,
      name: sanitizeName(chat.name),
      messages: sanitizeMessages(chat.messages),
      session: sanitizeSession(chat.session),
      createdAt: chat.createdAt || new Date().toISOString(),
      updatedAt: chat.updatedAt || chat.createdAt || new Date().toISOString()
    }));
}

function sanitizeName(value) {
  const name = String(value || 'New Kamiya Chat').trim();
  return name.slice(0, 80) || 'New Kamiya Chat';
}

function sanitizeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-maxMessages).map((message) => ({
    id: String(message.id || ''),
    role: ['user', 'assistant', 'system'].includes(message.role) ? message.role : 'assistant',
    content: String(message.content || '').slice(0, 12000),
    createdAt: message.createdAt || new Date().toISOString(),
    cards: Array.isArray(message.cards) ? message.cards : undefined,
    intent: message.intent && typeof message.intent === 'object' ? message.intent : undefined
  }));
}

function sanitizeSession(value) {
  return value && typeof value === 'object' ? value : {};
}

export default router;
