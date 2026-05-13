import pool from '../db.js';
import IntentEngineService from './IntentEngineService.js';
import NeedExpansionService from './NeedExpansionService.js';
import StoryEngineService from './StoryEngineService.js';
import NeedService from './NeedService.js';
import WorldGraphPopulator from './WorldGraphPopulator.js';
import { getTemporalClient } from '../workers/temporalWorker.js';

class EventRouter {
  async handleEvent(event) {
    const { eventType } = event;
    console.log(`EventRouter: Routing ${eventType}`);

    try {
      // Dispatch to agent workflow for relevant events
      const agentEvents = [
        'need.created', 'need.escalated', 'task.completed',
        'project.created', 'treaty.proposed', 'crisis.triggered',
        'governance.proposal_created', 'impact.verified', 'bounty.created'
      ];

      if (agentEvents.includes(eventType)) {
        const client = await getTemporalClient();
        if (client) {
          client.workflow.start('agentEventWorkflow', {
            taskQueue: 'agent-coordination',
            workflowId: `agent-event-${event.id || Date.now()}`,
            args: [event]
          }).catch(err => console.error('EventRouter: Failed to start agent workflow', err));
        }
      }

      switch (eventType) {
        case 'need.created':
          await WorldGraphPopulator.handleNeedCreated(event);
          await this.handleNeedCreated(event);
          break;

        case 'task.completed':
          await WorldGraphPopulator.handleTaskCompleted(event);
          await this.handleTaskCompleted(event);
          break;

        case 'task.generated':
          await WorldGraphPopulator.handleTaskGenerated(event);
          await this.handleTaskGenerated(event);
          break;

        case 'resource.matched':
          await this.handleResourceMatched(event);
          break;

        case 'community.alert':
          await this.handleCommunityAlert(event);
          break;

        case 'trust.updated':
          await WorldGraphPopulator.handleTrustUpdated(event);
          await this.handleTrustUpdated(event);
          break;

        case 'story.created':
          await this.handleStoryCreated(event);
          break;

        case 'impact.verified':
          await WorldGraphPopulator.handleImpactVerified(event);
          await this.handleImpactVerified(event);
          break;

        case 'mission.escalated':
          await this.handleMissionEscalated(event);
          break;

        case 'community.joined':
          await WorldGraphPopulator.handleCommunityJoined(event);
          break;

        case 'task.blocked':
          await WorldGraphPopulator.handleTaskBlocked(event);
          break;

        case 'resource.created':
          await WorldGraphPopulator.handleResourceCreated(event);
          break;

        default:
          console.log(`EventRouter: No specific handler for ${eventType}`);
      }
    } catch (err) {
      console.error(`EventRouter: Error handling ${eventType}`, err);
    }
  }

  async handleNeedCreated(event) {
    const { entityId, actorId, id: causationId } = event;
    const needId = entityId;

    console.log(`EventRouter: Processing need ${needId}`);

    // Call IntentEngineService to register the need in the civic kernel
    // We fetch the need first because the event payload might not be complete
    const needResult = await pool.query('SELECT * FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) return;
    const need = needResult.rows[0];

    await IntentEngineService.registerNeedCreated(need, { id: actorId }, null, causationId);

    // Handle Need Expansion or Needs Board addition
    const EXPANSION_THRESHOLD = 2.5;
    if (need.complexity_score >= EXPANSION_THRESHOLD) {
      await NeedExpansionService.expandNeed(need, causationId);
    } else {
      await NeedService.addTaskToNeedsBoard(need);
    }

    // Process Matches
    await NeedService.processMatches(need, causationId);
  }

  async handleTaskCompleted(event) {
    const { entityId, payload } = event;
    console.log(`EventRouter: Task ${entityId} completed`);
  }

  async handleTaskGenerated(event) {
    const { entityId, payload } = event;
    console.log(`EventRouter: Tasks generated for project ${entityId}`);

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [entityId]);
    if (projectResult.rows.length === 0) return;
    const project = projectResult.rows[0];

    const needId = payload.needId;
    const needResult = await pool.query('SELECT * FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) return;
    const need = needResult.rows[0];

    const tasksResult = await pool.query('SELECT * FROM tasks WHERE project_id = $1', [entityId]);
    const tasks = tasksResult.rows;

    await IntentEngineService.registerNeedExpansion(need, project, tasks);
  }

  async handleResourceMatched(event) {
    console.log(`EventRouter: Resource matched`);
  }

  async handleCommunityAlert(event) {
    console.log(`EventRouter: Community alert`);
  }

  async handleTrustUpdated(event) {
    console.log(`EventRouter: Trust updated for user ${event.entityId}`);
  }

  async handleStoryCreated(event) {
    console.log(`EventRouter: Story created`);
  }

  async handleImpactVerified(event) {
    console.log(`EventRouter: Impact verified`);
  }

  async handleMissionEscalated(event) {
    console.log(`EventRouter: Mission escalated`);
  }
}

export default new EventRouter();
