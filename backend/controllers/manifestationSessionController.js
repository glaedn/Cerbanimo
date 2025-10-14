import pool from '../db.js';
import { generateManifestationSummary } from '../services/manifestationService.js';

// Create a new manifestation session
export const createSession = async (req, res) => {
  const { intentionId, realmId } = req.body;
  const userId = req.auth.payload.sub;

  try {
    const newSession = await pool.query(
      "INSERT INTO manifestation_sessions (intention_id, realm_id, participants) VALUES ($1, $2, $3) RETURNING *",
      [intentionId, realmId, [userId]]
    );
    res.status(201).json(newSession.rows[0]);
  } catch (error) {
    console.error('Error creating manifestation session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Record a batch of resonance events
export const recordBatchResonance = async (req, res) => {
  const { sessionId } = req.params;
  const { resonanceEvents } = req.body;

  try {
    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET resonance_events = resonance_events || $1 WHERE id = $2 RETURNING *",
      [resonanceEvents, sessionId]
    );
    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error recording batch resonance events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Record a generic event
export const recordEvent = async (req, res) => {
  const { sessionId } = req.params;
  const { event } = req.body;

  try {
    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET events = array_append(events, $1) WHERE id = $2 RETURNING *",
      [event, sessionId]
    );
    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start a manifestation session
export const startSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET start_time = NOW(), status = 'active' WHERE id = $1 RETURNING *",
      [sessionId]
    );
    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error starting manifestation session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// End a manifestation session
export const endSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionRes = await pool.query("SELECT intention_id FROM manifestation_sessions WHERE id = $1", [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    const intentionId = sessionRes.rows[0].intention_id;

    const intentionRes = await pool.query("SELECT * FROM intentions WHERE id = $1", [intentionId]);
    const petalsRes = await pool.query("SELECT * FROM petals WHERE intention_id = $1", [intentionId]);

    const intention = intentionRes.rows[0];
    const petals = petalsRes.rows;

    const summary = await generateManifestationSummary(intention, petals);

    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET end_time = NOW(), status = 'completed', manifestation_summary = $1 WHERE id = $2 RETURNING *",
      [summary, sessionId]
    );

    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error ending manifestation session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a participant to a session
export const addParticipant = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;

  try {
    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET participants = array_append(participants, $1) WHERE id = $2 RETURNING *",
      [userId, sessionId]
    );
    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error adding participant to session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Record a resonance event
export const recordResonance = async (req, res) => {
  const { sessionId } = req.params;
  const { resonanceEvent } = req.body;

  try {
    const updatedSession = await pool.query(
      "UPDATE manifestation_sessions SET resonance_events = array_append(resonance_events, $1) WHERE id = $2 RETURNING *",
      [resonanceEvent, sessionId]
    );
    res.json(updatedSession.rows[0]);
  } catch (error) {
    console.error('Error recording resonance event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};