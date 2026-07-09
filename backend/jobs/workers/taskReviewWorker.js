import boss from '../boss.js';
import TaskReviewService from '../../services/TaskReviewService.js';

export const TASK_REVIEW_PEER_DEADLINE_QUEUE = 'task-review-peer-deadline';
export const TASK_REVIEW_PM_DEADLINE_QUEUE = 'task-review-pm-deadline';
export const TASK_REVIEW_FINALIZE_QUEUE = 'task-review-finalize';
export const TASK_REVIEW_ASSIGNMENT_EXPIRY_QUEUE = 'task-review-assignment-expiry';

export const TASK_REVIEW_QUEUES = [
  TASK_REVIEW_PEER_DEADLINE_QUEUE,
  TASK_REVIEW_PM_DEADLINE_QUEUE,
  TASK_REVIEW_FINALIZE_QUEUE,
  TASK_REVIEW_ASSIGNMENT_EXPIRY_QUEUE
];

export async function startTaskReviewWorker() {
  await boss.work(TASK_REVIEW_PEER_DEADLINE_QUEUE, async (job) => {
    return TaskReviewService.handlePeerDeadline({ reviewRoundId: job.data?.reviewRoundId });
  });

  await boss.work(TASK_REVIEW_PM_DEADLINE_QUEUE, async (job) => {
    return TaskReviewService.handlePmDeadline({ reviewRoundId: job.data?.reviewRoundId });
  });

  await boss.work(TASK_REVIEW_FINALIZE_QUEUE, async (job) => {
    return TaskReviewService.handleReviewFinalize({ reviewRoundId: job.data?.reviewRoundId });
  });

  await boss.work(TASK_REVIEW_ASSIGNMENT_EXPIRY_QUEUE, async (job) => {
    return TaskReviewService.handleAssignmentExpiry({ assignmentId: job.data?.assignmentId });
  });
}
