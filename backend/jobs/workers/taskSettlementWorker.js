import boss from '../boss.js';
import TaskSettlementService, {
  TASK_SETTLEMENT_QUEUE,
  TASK_SETTLEMENT_SWEEP_QUEUE
} from '../../services/TaskSettlementService.js';

export const TASK_SETTLEMENT_QUEUES = [TASK_SETTLEMENT_QUEUE, TASK_SETTLEMENT_SWEEP_QUEUE];

export async function startTaskSettlementWorker() {
  await boss.work(TASK_SETTLEMENT_QUEUE, async job => {
    try {
      const { settlementId } = normalizeSettlementJobPayload(job);
      if (!settlementId) throw new Error('settlementId is required for task settlement jobs');
      return await TaskSettlementService.settle({ settlementId });
    } catch (error) {
      if (error.retryable === false) return { blocked: true, code: error.code };
      throw error;
    }
  });
  await boss.work(TASK_SETTLEMENT_SWEEP_QUEUE, async () => TaskSettlementService.enqueuePending());
}

export function normalizeSettlementJobPayload(job) {
  if (!job) return {};
  if (Array.isArray(job)) return normalizeSettlementJobPayload(job[0]);
  if (job.data && typeof job.data === 'object') return job.data;
  if (typeof job === 'object') return job;
  return {};
}
