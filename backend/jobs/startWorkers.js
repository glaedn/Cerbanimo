import { startAgentWorker } from './workers/agentWorker.js';
import { AUTOMATION_EXECUTION_QUEUE, startAutomationWorker } from './workers/automationWorker.js';
import { PROJECT_BOOTSTRAP_QUEUE, startProjectBootstrapWorker } from './workers/projectBootstrapWorker.js';
import { TASK_REVIEW_QUEUES, startTaskReviewWorker } from './workers/taskReviewWorker.js';
import { startDomainWorkers } from './workers/domain/domainWorkers.js';
import boss from './boss.js';
import VestingService from '../services/VestingService.js';
import AuditService from '../services/AuditService.js';
import TokenDecayService from '../services/TokenDecayService.js';
import TaskRoutingService from '../services/TaskRoutingService.js';
import ProjectHealthService from '../services/ProjectHealthService.js';
import GuildService from '../services/GuildService.js';
import GuildHealthService from '../services/GuildHealthService.js';
import ConstellationHealthService from '../services/ConstellationHealthService.js';
import WeeklyWrapUpService from '../services/WeeklyWrapUpService.js';
import EscalationService from '../services/EscalationService.js';
import TreatyEnforcementService from '../services/TreatyEnforcementService.js';
import CrisisService from '../services/CrisisService.js';
import taskController from '../controllers/taskController.js';
import { validatePendingInterests } from '../services/interestValidationService.js';
import pool from '../db.js';

export async function startWorkers() {
  console.log('Initializing pg-boss workers...');

  try {
    // Explicitly create queues to avoid "Queue does not exist" errors
    const queues = [
      'agent-execution',
      'scheduled-tasks',
      'civic-events',
      'nightly-reset-job',
      'interest-validation-job',
      'guild-membership-sync-job',
      'skill-enrichment-job',
      'weekly-wrapup-job',
      'need-escalation-job',
      'treaty-enforcement-job',
      'crisis-evaluation-job',
      'reward-adjustment-job',
      'intelligence-scoring-job',
      'daily-task-activation-job',
      'vesting-release-job',
      'audit-process-job',
      'founding-member-decay-job',
      'token-decay-job',
      'community-health-update-job',
      AUTOMATION_EXECUTION_QUEUE,
      PROJECT_BOOTSTRAP_QUEUE,
      ...TASK_REVIEW_QUEUES
    ];

    for (const queue of queues) {
      try {
        await boss.createQueue(queue);
      } catch (err) {
        // createQueue might fail if it already exists or other reasons, log and continue
        console.warn(`Queue creation notice for ${queue}:`, err.message);
      }
    }

    // New domain queues
    await boss.createQueue('governance-execution');
    await boss.createQueue('chronicle-generation');

    await startAgentWorker();
    await startAutomationWorker();
    await startProjectBootstrapWorker();
    await startTaskReviewWorker();
    await startDomainWorkers();

    // Define worker for scheduled tasks
    await boss.work('scheduled-tasks', async (job) => {
      const { type } = job.data;
      console.log(`Running scheduled task: ${type}`);

      switch (type) {
        case 'nightly-reset':
          return await taskController.resetAllSpentPoints();
        case 'interest-validation':
          return await validatePendingInterests();
        case 'guild-membership-sync':
          return await GuildService.syncMembershipsWithSkills();
        case 'skill-enrichment':
          return await GuildService.enrichSkillsAndHierarchy();
        case 'weekly-wrapup':
          return await WeeklyWrapUpService.generateWeeklyWrapUps();
        case 'need-escalation':
          return await EscalationService.checkAndEscalateNeeds();
        case 'treaty-enforcement':
          return await TreatyEnforcementService.runEnforcementCycle();
        case 'crisis-evaluation':
          return await CrisisService.evaluateAutoCrisis();
        case 'reward-adjustment':
          return await TaskRoutingService.applyDynamicRewardAdjustment();
        case 'intelligence-scoring':
          return await runIntelligenceScoring();
        case 'daily-task-activation':
          return await TaskRoutingService.runDailyTaskActivationAndNotification();
        case 'vesting-release':
          return await VestingService.processVestingReleases();
        case 'audit-process':
          return await AuditService.processPendingAudits();
        case 'founding-member-decay':
          return await runFoundingMemberDecay();
        case 'token-decay':
          return await runTokenDecay();
        case 'community-health-update':
          return await runCommunityHealthUpdate();
        default:
          console.warn(`Unknown scheduled task type: ${type}`);
      }
    });

    // Schedule tasks with UNIQUE names to prevent overwriting
    await boss.schedule('daily-task-activation-job', '0 6 * * *', { type: 'daily-task-activation' }, { queue: 'scheduled-tasks' });
    await boss.schedule('vesting-release-job', '0 6 * * *', { type: 'vesting-release' }, { queue: 'scheduled-tasks' });
    await boss.schedule('audit-process-job', '0 7 * * *', { type: 'audit-process' }, { queue: 'scheduled-tasks' });
    await boss.schedule('founding-member-decay-job', '0 0 * * *', { type: 'founding-member-decay' }, { queue: 'scheduled-tasks' });
    await boss.schedule('token-decay-job', '0 3 1 * *', { type: 'token-decay' }, { queue: 'scheduled-tasks' });
    await boss.schedule('community-health-update-job', '0 */4 * * *', { type: 'community-health-update' }, { queue: 'scheduled-tasks' });
    await boss.schedule('nightly-reset-job', '0 0 * * *', { type: 'nightly-reset' }, { queue: 'scheduled-tasks' });
    await boss.schedule('interest-validation-job', '0 1 * * *', { type: 'interest-validation' }, { queue: 'scheduled-tasks' });
    await boss.schedule('guild-membership-sync-job', '*/15 * * * *', { type: 'guild-membership-sync' }, { queue: 'scheduled-tasks' });
    await boss.schedule('skill-enrichment-job', '0 0 * * *', { type: 'skill-enrichment' }, { queue: 'scheduled-tasks' });
    await boss.schedule('weekly-wrapup-job', '0 2 * * *', { type: 'weekly-wrapup' }, { queue: 'scheduled-tasks' });
    await boss.schedule('need-escalation-job', '0 3 * * *', { type: 'need-escalation' }, { queue: 'scheduled-tasks' });
    await boss.schedule('treaty-enforcement-job', '0 4 * * *', { type: 'treaty-enforcement' }, { queue: 'scheduled-tasks' });
    await boss.schedule('crisis-evaluation-job', '0 5 * * *', { type: 'crisis-evaluation' }, { queue: 'scheduled-tasks' });
    await boss.schedule('reward-adjustment-job', '0 */6 * * *', { type: 'reward-adjustment' }, { queue: 'scheduled-tasks' });
    await boss.schedule('intelligence-scoring-job', '0 * * * *', { type: 'intelligence-scoring' }, { queue: 'scheduled-tasks' });

    console.log('All pg-boss workers and schedules started.');
  } catch (err) {
    console.error('Failed to start pg-boss workers:', err);
  }
}

async function runFoundingMemberDecay() {
  console.log('Running founding member trust decay...');
  try {
    // linearly decay the trust bonus for users inside their bootstrap window
    // Bonus is level 3 -> level 1 (2 levels) over 60 days.
    // 2 / 60 = 0.033333 per day.

    await pool.query(`
      UPDATE users
      SET trust_level = GREATEST(1.0, trust_level - 0.0333)
      WHERE is_founding_member = TRUE
        AND trust_bootstrap_expires_at > NOW()
        AND trust_level > 1.0
    `);

    await pool.query(`
      UPDATE users
      SET is_founding_member = FALSE
      WHERE is_founding_member = TRUE
        AND trust_bootstrap_expires_at <= NOW()
    `);

  } catch (err) {
    console.error('Founding member decay failed:', err);
  }
}

async function runTokenDecay() {
  console.log('Running monthly token decay job...');
  try {
    // Process users in chunks
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const usersRes = await pool.query(
        "SELECT id FROM users WHERE cotokens > 0 LIMIT $1 OFFSET $2",
        [limit, offset]
      );

      if (usersRes.rows.length === 0) {
        hasMore = false;
      } else {
        for (const user of usersRes.rows) {
          await TokenDecayService.decayUserTokens(user.id).catch(err =>
            console.error(`Decay failed for user ${user.id}:`, err)
          );
        }
        offset += limit;
      }
    }

    // Process communities
    const communitiesRes = await pool.query(
      "SELECT community_id FROM community_treasury WHERE cotoken_balance > 0"
    );
    for (const comm of communitiesRes.rows) {
      await TokenDecayService.decayCommunityTokens(comm.community_id).catch(err =>
        console.error(`Decay failed for community ${comm.community_id}:`, err)
      );
    }

  } catch (err) {
    console.error('Token decay job failed:', err);
  }
}

async function runCommunityHealthUpdate() {
  console.log('Updating community health scores...');
  try {
    await pool.query(`
      UPDATE communities c
      SET health_score = sub.calc_score
      FROM (
        SELECT
          c2.id,
          CASE
            WHEN cardinality(c2.approved_projects) = 0 THEN 0.94
            ELSE (
              SELECT COUNT(*)::float / cardinality(c2.approved_projects)
              FROM projects p
              WHERE p.id = ANY(c2.approved_projects)
                AND p.status = 'active'
            )
          END as calc_score
        FROM communities c2
      ) sub
      WHERE c.id = sub.id
    `);
  } catch (err) {
    console.error('Community health update failed:', err);
  }
}

async function runIntelligenceScoring() {
  console.log('Running intelligence scoring (Priority & Project Health)');
  try {
    // Score all unassigned tasks
    const tasks = await pool.query("SELECT id FROM tasks WHERE status::text LIKE $1", ['%unassigned']);
    for (const task of tasks.rows) {
      await TaskRoutingService.calculatePriorityScore(task.id);
    }

    // Score all active projects
    const projects = await pool.query("SELECT id FROM projects WHERE status = 'active'");
    for (const project of projects.rows) {
      await ProjectHealthService.calculateHealthScore(project.id);
    }

    // Score all guilds
    const guilds = await pool.query("SELECT id FROM guilds WHERE status != 'dissolved'");
    for (const guild of guilds.rows) {
      await GuildHealthService.calculateGuildMetrics(guild.id);
    }

    // Score all active constellations
    const constellations = await pool.query("SELECT id FROM constellations WHERE status NOT IN ('completed', 'dissolved')");
    for (const constellation of constellations.rows) {
      await ConstellationHealthService.calculateConstellationMetrics(constellation.id);
    }
  } catch (err) {
    console.error('Intelligence scoring failed:', err);
  }
}
