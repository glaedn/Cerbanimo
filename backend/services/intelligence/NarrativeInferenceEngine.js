import pool from '../../db.js';
import StoryEngineService from '../StoryEngineService.js';

class NarrativeInferenceEngine {
  async getNarratives(userId, context) {
    const narratives = [];

    // Infer meaningful contribution arcs
    if (context.temporal.recentActivityCount > 5) {
      narratives.push({
        type: 'narrative',
        priority: 'low',
        persona: 'Archivist',
        message: "Your work contributed to three successful community distributions this month.",
        impact_level: 'significant'
      });
    }

    // Pull from StoryEngine
    try {
      const storyUnits = await pool.query(
        'SELECT content FROM story_units WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (storyUnits.rowCount > 0 && storyUnits.rows[0].content) {
        narratives.push({
          type: 'narrative',
          priority: 'medium',
          persona: 'Chronicler',
          message: storyUnits.rows[0].content,
          impact_level: 'personal'
        });
      }
    } catch (err) {
      console.error('Error fetching story units for NarrativeInferenceEngine:', err);
    }

    return narratives;
  }
}

export default new NarrativeInferenceEngine();
