import pool from '../db.js';
import CivicEventService from './CivicEventService.js';
import WorldGraphService from './WorldGraphService.js';

const urgencyWeights = {
  low: 10,
  medium: 25,
  high: 60,
  critical: 90
};

class IntentEngineService {
  classifyNeed(need) {
    const urgency = (need.urgency_level || need.urgency || 'medium').toLowerCase();
    const category = need.category || 'Coordination';
    const hasLocation = Boolean(need.location_text || need.location || need.latitude || need.longitude);
    const complexity = Number(need.complexity_score) || 0;

    return {
      intentType: 'need',
      category,
      urgency,
      spatial: hasLocation,
      expansionRecommended: complexity >= 2.5,
      signals: {
        hasDeadline: Boolean(need.required_before_date),
        hasCommunityScope: Boolean(need.requestor_community_id),
        hasUserScope: Boolean(need.requestor_user_id),
        complexity
      }
    };
  }

  calculatePriorityScore(need, classification) {
    const urgency = classification.urgency || 'medium';
    const complexity = Number(need.complexity_score) || 0;
    const deadlineBoost = need.required_before_date ? 10 : 0;
    const locationBoost = classification.spatial ? 5 : 0;
    return Math.min(100, (urgencyWeights[urgency] || 25) + complexity * 8 + deadlineBoost + locationBoost);
  }

  async createIntentRecord(intent, client = null) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO intent_records (
         intent_type, source_type, source_id, actor_user_id, title, body,
         classification, priority_score, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING *`,
      [
        intent.intentType,
        intent.sourceType,
        intent.sourceId,
        intent.actorUserId || null,
        intent.title,
        intent.body || '',
        JSON.stringify(intent.classification || {}),
        intent.priorityScore || 0,
        intent.status || 'active'
      ]
    );

    return result.rows[0];
  }

  async registerNeedCreated(need, user = null, client = null, causationId = null) {
    const classification = this.classifyNeed(need);
    const priorityScore = this.calculatePriorityScore(need, classification);
    const actorId = user?.id || need.requestor_user_id || null;

    const intent = await this.createIntentRecord({
      intentType: 'need',
      sourceType: 'need',
      sourceId: need.id,
      actorUserId: actorId,
      title: need.name,
      body: need.description,
      classification,
      priorityScore,
      status: need.status || 'active'
    }, client);

    const event = await CivicEventService.recordEvent({
      eventType: 'intent.need.declared',
      actorId,
      entityType: 'need',
      entityId: need.id,
      payload: {
        intentId: intent.id,
        name: need.name,
        category: need.category,
        urgency: classification.urgency,
        priorityScore,
        complexityScore: need.complexity_score
      },
      correlationId: `need:${need.id}`,
      causationId
    }, client);

    const needNode = await WorldGraphService.upsertNode({
      nodeType: 'need',
      entityType: 'need',
      entityId: need.id,
      label: need.name,
      description: need.description,
      status: need.status || 'open',
      properties: {
        category: need.category,
        urgency: classification.urgency,
        priorityScore,
        intentId: intent.id,
        eventId: event.id,
        locationText: need.location_text || need.location || null,
        latitude: need.latitude || null,
        longitude: need.longitude || null
      }
    }, client);

    if (need.requestor_user_id) {
      await WorldGraphService.linkEntities(
        {
          nodeType: 'person',
          entityType: 'user',
          entityId: need.requestor_user_id,
          label: `User ${need.requestor_user_id}`
        },
        {
          nodeType: 'need',
          entityType: 'need',
          entityId: need.id,
          label: need.name,
          description: need.description,
          status: need.status || 'open'
        },
        'declared',
        { eventId: event.id },
        1,
        client
      );
    }

    if (need.requestor_community_id) {
      await WorldGraphService.linkEntities(
        {
          nodeType: 'community',
          entityType: 'community',
          entityId: need.requestor_community_id,
          label: `Community ${need.requestor_community_id}`
        },
        {
          nodeType: 'need',
          entityType: 'need',
          entityId: need.id,
          label: need.name,
          description: need.description,
          status: need.status || 'open'
        },
        'hosts',
        { eventId: event.id },
        1,
        client
      );
    }

    return { intent, event, node: needNode };
  }

  async registerNeedExpansion(need, project, tasks = [], client = null, causationId = null) {
    const event = await CivicEventService.recordEvent({
      eventType: 'mission.spawned.from_need',
      actorId: need.requestor_user_id || project.creator_id || null,
      entityType: 'project',
      entityId: project.id,
      payload: {
        needId: need.id,
        projectId: project.id,
        taskCount: tasks.length,
        dueDate: project.due_date || need.required_before_date || null
      },
      correlationId: `need:${need.id}`,
      causationId
    }, client);

    await WorldGraphService.linkEntities(
      {
        nodeType: 'need',
        entityType: 'need',
        entityId: need.id,
        label: need.name,
        description: need.description,
        status: need.status || 'open'
      },
      {
        nodeType: 'mission',
        entityType: 'project',
        entityId: project.id,
        label: project.name,
        description: project.description,
        status: project.status || 'active',
        properties: { dueDate: project.due_date || null }
      },
      'spawned',
      { eventId: event.id },
      1,
      client
    );

    for (const task of tasks) {
      await WorldGraphService.linkEntities(
        {
          nodeType: 'task',
          entityType: 'task',
          entityId: task.id,
          label: task.name,
          description: task.description,
          status: task.status || 'unassigned',
          properties: {
            impactLabel: task.impact_label || null,
            impactWeight: task.impact_weight || null,
            rewardTokens: task.reward_tokens || null
          }
        },
        {
          nodeType: 'mission',
          entityType: 'project',
          entityId: project.id,
          label: project.name,
          description: project.description,
          status: project.status || 'active'
        },
        'contributes_to',
        { eventId: event.id, needId: need.id },
        1,
        client
      );
    }

    return event;
  }
}

export default new IntentEngineService();
