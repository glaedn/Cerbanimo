import WorldGraphService, { RELATIONSHIPS } from './WorldGraphService.js';
import pool from '../db.js';

class WorldGraphPopulator {
  async handleTrustUpdated(event) {
    const { actorId, payload = {} } = event;
    const { skillId, newLevel } = payload;

    if (!actorId || !skillId) return;

    // person -> trust -> skill/guild
    await WorldGraphService.linkEntities(
      { nodeType: 'person', entityType: 'user', entityId: actorId, label: `User ${actorId}` },
      { nodeType: 'skill', entityType: 'skill', entityId: skillId, label: `Skill ${skillId}` },
      RELATIONSHIPS.TRUSTS,
      { level: newLevel },
      (newLevel || 0) / 10
    );
  }

  async handleNeedCreated(event) {
    const { entityId, payload = {} } = event;
    const { name, category, urgency } = payload;

    if (!entityId) return;

    const needNode = {
      nodeType: 'need',
      entityType: 'need',
      entityId: entityId,
      label: name || `Need ${entityId}`,
      properties: { category, urgency }
    };

    await WorldGraphService.upsertNode(needNode);

    // Link to requestor if exists in payload or fetch from DB
    try {
      const needData = await pool.query('SELECT requestor_user_id, requestor_community_id FROM needs WHERE id = $1', [entityId]);
      if (needData.rows.length > 0) {
        const { requestor_user_id, requestor_community_id } = needData.rows[0];
        if (requestor_user_id) {
          await WorldGraphService.linkEntities(
            { nodeType: 'person', entityType: 'user', entityId: requestor_user_id, label: `User ${requestor_user_id}` },
            needNode,
            RELATIONSHIPS.DECLARED
          );
        }
        if (requestor_community_id) {
          await WorldGraphService.linkEntities(
            { nodeType: 'community', entityType: 'community', entityId: requestor_community_id, label: `Community ${requestor_community_id}` },
            needNode,
            RELATIONSHIPS.HOSTS
          );
        }
      }
    } catch (err) {
      console.error('WorldGraphPopulator: Error linking need to requestor', err.message);
    }
  }

  async handleTaskCompleted(event) {
    const { actorId, entityId, payload = {} } = event;

    if (!actorId || !entityId) return;

    // person -> FULFILLS -> task
    await WorldGraphService.linkEntities(
      { nodeType: 'person', entityType: 'user', entityId: actorId, label: `User ${actorId}` },
      { nodeType: 'task', entityType: 'task', entityId: entityId, label: `Task ${entityId}` },
      RELATIONSHIPS.FULFILLS,
      { completedAt: new Date() }
    );
  }

  async handleTaskGenerated(event) {
    const { entityId, payload = {} } = event; // entityId is projectId
    const { needId, tasks = [] } = payload;

    if (!entityId) return;

    const projectNode = { nodeType: 'mission', entityType: 'project', entityId: entityId, label: `Project ${entityId}` };

    if (needId) {
      await WorldGraphService.linkEntities(
        { nodeType: 'need', entityType: 'need', entityId: needId, label: `Need ${needId}` },
        projectNode,
        RELATIONSHIPS.SPAWNED
      );
    }

    for (const task of (tasks || [])) {
      await WorldGraphService.linkEntities(
        { nodeType: 'task', entityType: 'task', entityId: task.id, label: task.name, properties: { skill_name: task.skill_name } },
        projectNode,
        RELATIONSHIPS.CONTRIBUTES_TO
      );
    }
  }

  async handleCommunityJoined(event) {
    const { actorId, entityId, entityType } = event;

    if (!actorId || !entityId || !entityType) return;

    await WorldGraphService.linkEntities(
      { nodeType: 'person', entityType: 'user', entityId: actorId, label: `User ${actorId}` },
      { nodeType: entityType === 'guild' ? 'guild' : 'community', entityType: entityType, entityId: entityId, label: `${entityType} ${entityId}` },
      RELATIONSHIPS.MEMBER_OF
    );
  }

  async handleTaskBlocked(event) {
    const { entityId, payload = {} } = event;
    const { blockedByTaskId } = payload;

    if (!entityId || !blockedByTaskId) return;

    await WorldGraphService.linkEntities(
      { nodeType: 'task', entityType: 'task', entityId: entityId, label: `Task ${entityId}` },
      { nodeType: 'task', entityType: 'task', entityId: blockedByTaskId, label: `Task ${blockedByTaskId}` },
      RELATIONSHIPS.BLOCKED_BY
    );
  }

  async handleResourceCreated(event) {
    const { entityId, actorId, payload = {} } = event;
    const { name, category } = payload;

    if (!entityId || !actorId) return;

    await WorldGraphService.linkEntities(
      { nodeType: 'person', entityType: 'user', entityId: actorId, label: `User ${actorId}` },
      { nodeType: 'resource', entityType: 'resource', entityId: entityId, label: name || `Resource ${entityId}`, properties: { category } },
      RELATIONSHIPS.DECLARED
    );
  }

  async handleImpactVerified(event) {
    const { entityId, payload = {} } = event;
    const { targetEntityType, targetEntityId, confidence } = payload;

    if (!targetEntityType || !targetEntityId) return;

    await WorldGraphService.upsertNode({
      nodeType: targetEntityType,
      entityType: targetEntityType,
      entityId: targetEntityId,
      label: `${targetEntityType} ${targetEntityId}`,
      properties: { verifiedConfidence: confidence }
    });
  }
}

export default new WorldGraphPopulator();
