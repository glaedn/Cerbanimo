import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskReviewAuthorizationService from './TaskReviewAuthorizationService.js';
import TaskAccessService from './TaskAccessService.js';

describe('TaskReviewAuthorizationService', () => {
  afterEach(() => vi.restoreAllMocks());

  function mockTaskAccess(task = {}) {
    vi.spyOn(TaskAccessService, 'policyForTask').mockResolvedValue({
      exists: true,
      canViewTask: { allowed: true }
    });
    vi.spyOn(TaskAccessService, 'loadTask').mockResolvedValue({
      id: 10,
      project_creator_id: 99,
      ...task
    });
  }

  it('denies contributor peer blessing even with an assignment', async () => {
    mockTaskAccess();
    const policy = await TaskReviewAuthorizationService.policyForReview({
      taskId: 10,
      round: { id: 1, task_id: 10, submission_actor_user_id: 7 },
      assignment: { id: 2, reviewer_user_id: 7, reviewer_role: 'peer_reviewer', status: 'accepted' },
      authContext: { actorUserId: 7, roles: [] }
    });

    expect(policy.canBless.allowed).toBe(false);
  });

  it('allows accepted peer assignment to view frozen evidence', async () => {
    mockTaskAccess();
    const policy = await TaskReviewAuthorizationService.policyForReview({
      taskId: 10,
      round: { id: 1, task_id: 10, submission_actor_user_id: 7 },
      assignment: { id: 2, reviewer_user_id: 8, reviewer_role: 'peer_reviewer', status: 'accepted' },
      authContext: { actorUserId: 8, roles: [] }
    });

    expect(policy.canViewFrozenEvidence.allowed).toBe(true);
    expect(policy.canBless.allowed).toBe(true);
  });

  it('treats PM authority as project-scoped and denies contributor self-seal by default', async () => {
    mockTaskAccess({ project_creator_id: 7 });
    const policy = await TaskReviewAuthorizationService.policyForReview({
      taskId: 10,
      round: { id: 1, task_id: 10, submission_actor_user_id: 7 },
      assignment: null,
      authContext: { actorUserId: 7, roles: ['project_manager'] }
    });

    expect(policy.canApplyRitualSeal.allowed).toBe(false);
  });
});
