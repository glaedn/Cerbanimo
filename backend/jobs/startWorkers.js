import { startAgentWorker } from './workers/agentWorker.js';
import { startDomainWorkers } from './workers/domain/domainWorkers.js';
import boss from './boss.js';
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
      'intelligence-scoring-job'
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
        default:
          console.warn(`Unknown scheduled task type: ${type}`);
      }
    });

    // Schedule tasks with UNIQUE names to prevent overwriting
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
