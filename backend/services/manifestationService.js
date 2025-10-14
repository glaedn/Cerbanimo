import pool from '../db.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getPetalsForIntention(intentionId) {
    const query = `
        SELECT p.name, p.description, p.status
        FROM petals p
        WHERE p.project_id = (SELECT project_id FROM intentions WHERE id = $1)
    `;
    try {
        const { rows } = await pool.query(query, [intentionId]);
        return rows;
    } catch (error) {
        console.error(`Error fetching petals for intention ${intentionId}:`, error);
        throw error;
    }
}

export const generateManifestationSummary = async (sessionId) => {
  try {
    const sessionRes = await pool.query("SELECT * FROM manifestation_sessions WHERE id = $1", [sessionId]);
    if (sessionRes.rows.length === 0) {
      throw new Error("Session not found");
    }
    const session = sessionRes.rows[0];

    const intentionRes = await pool.query("SELECT * FROM intentions WHERE id = $1", [session.intention_id]);
    if (intentionRes.rows.length === 0) {
      throw new Error("Intention not found");
    }
    const intention = intentionRes.rows[0];

    const petals = await getPetalsForIntention(intention.id);

    const prompt = `
      Based on the following intention and its associated petals, generate a short, inspiring summary (1-2 sentences) of the emergent theme.
      The summary should capture the essence of the collective goal.

      Intention: "${intention.name}"
      Description: "${intention.description}"

      Associated Petals:
      ${petals.map(p => `- ${p.name} (${p.status}): ${p.description}`).join("\n")}

      Emergent Theme Summary:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
    });

    const summary = response.choices[0].message.content.trim();

    await pool.query("UPDATE manifestation_sessions SET manifestation_summary = $1 WHERE id = $2", [summary, sessionId]);

    return summary;
  } catch (error) {
    console.error('Error generating manifestation summary:', error);
    throw error;
  }
};