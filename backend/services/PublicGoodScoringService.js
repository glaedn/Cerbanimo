import pool from '../db.js';
import AIGatewayService from './AIGatewayService.js';

const clampScore = (score) => Math.min(2, Math.max(0.2, Number(score) || 1));

class PublicGoodScoringService {
  async getCommunityContext(communityId, client = pool) {
    if (!communityId) return null;

    const communityResult = await client.query(
      `SELECT c.name, c.description, c.interest_tags
       FROM communities c
       WHERE c.id = $1`,
      [communityId]
    );

    if (communityResult.rows.length === 0) return null;
    const community = communityResult.rows[0];
    const interestTags = community.interest_tags || [];

    let values = [];
    if (interestTags.length > 0) {
      const interestsResult = await client.query(
        `SELECT name FROM interests WHERE id = ANY($1::int[]) OR name = ANY($2::text[])`,
        [
          interestTags.filter(tag => Number.isInteger(Number(tag))).map(Number),
          interestTags.map(String)
        ]
      );
      values = interestsResult.rows.map(row => row.name);
    }

    return {
      mission: {
        name: community.name,
        description: community.description
      },
      values
    };
  }

  parseScore(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return {
        score: clampScore(parsed.public_good_score ?? parsed.score),
        rationale: parsed.rationale || parsed.reasoning || ''
      };
    } catch {
      const numericMatch = text.match(/(?:score|public_good_score)?\s*[:=]?\s*(0?\.\d+|1(?:\.\d+)?|2(?:\.0+)?)/i);
      return {
        score: clampScore(numericMatch ? numericMatch[1] : 1),
        rationale: text.slice(0, 500)
      };
    }
  }

  async scoreProject(project, client = pool) {
    const communityContext = await this.getCommunityContext(project.community_id, client);
    const result = await AIGatewayService.analyze(
      `Score this project's public-good value as JSON: {"public_good_score": number from 0.2 to 2.0, "rationale": string}.`,
      {
        project: {
          name: project.name,
          description: project.description,
          outcome: project.outcome || project.outcomeStatement || null,
          tags: project.tags || []
        },
        communityContext
      },
      {
        systemInstruction: 'You evaluate civic/public-good alignment. Favor durable, inclusive, community-serving outcomes; penalize extractive, vague, spammy, or low-accountability projects.'
      }
    );

    return this.parseScore(result.text);
  }

  async scoreAndCacheProject(projectId, { source = 'ai_generated', client = pool } = {}) {
    const projectResult = await client.query(
      'SELECT id, name, description, tags, community_id FROM projects WHERE id = $1',
      [projectId]
    );
    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const score = await this.scoreProject(projectResult.rows[0], client);
    const updateResult = await client.query(
      `UPDATE projects
       SET public_good_score = $1,
           public_good_scored_at = NOW(),
           public_good_source = $2
       WHERE id = $3
       RETURNING public_good_score, public_good_scored_at, public_good_source`,
      [score.score, source, projectId]
    );

    return { ...updateResult.rows[0], rationale: score.rationale };
  }
}

export { clampScore };
export default new PublicGoodScoringService();
