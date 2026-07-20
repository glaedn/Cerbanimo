import { describe, expect, it } from 'vitest';
import TaskAccessService from './TaskAccessService.js';

describe('TaskAccessService policyForTaskRecord', () => {
  const privateTask = {
    id: 9,
    project_id: 7,
    creator_id: 1,
    project_creator_id: 2,
    assigned_user_ids: [3],
    project_visibility: 'private'
  };

  it('allows assigned users to view and submit evidence', () => {
    const policy = TaskAccessService.policyForTaskRecord(privateTask, { actorUserId: 3, scopes: [] });

    expect(policy.canViewTask.allowed).toBe(true);
    expect(policy.canViewEvidenceSummary.allowed).toBe(true);
    expect(policy.canViewEvidenceContent.allowed).toBe(true);
    expect(policy.canSubmitEvidence.allowed).toBe(true);
  });

  it('denies private task evidence to unrelated authenticated users', () => {
    const policy = TaskAccessService.policyForTaskRecord(privateTask, { actorUserId: 4, scopes: [] });

    expect(policy.canViewTask.allowed).toBe(false);
    expect(policy.canViewTaskAutomation.allowed).toBe(false);
    expect(policy.canViewEvidenceSummary.allowed).toBe(false);
    expect(policy.canViewEvidenceContent.allowed).toBe(false);
    expect(policy.canSubmitEvidence.allowed).toBe(false);
  });

  it('allows public task viewing without granting submit authority', () => {
    const policy = TaskAccessService.policyForTaskRecord(
      { ...privateTask, project_visibility: 'public' },
      { actorUserId: 4, scopes: [] }
    );

    expect(policy.canViewTask.allowed).toBe(true);
    expect(policy.canViewEvidenceSummary.allowed).toBe(true);
    expect(policy.canViewEvidenceContent.allowed).toBe(false);
    expect(policy.canSubmitEvidence.allowed).toBe(false);
  });

  it('carries an approved project view into task summaries without granting authority', () => {
    const policy = TaskAccessService.policyForTaskRecord(privateTask, {
      actorUserId: 4,
      scopes: [],
      authorizedProjectIds: [7]
    });

    expect(policy.canViewTask.allowed).toBe(true);
    expect(policy.canViewEvidenceSummary.allowed).toBe(true);
    expect(policy.canViewEvidenceContent.allowed).toBe(false);
    expect(policy.canSubmitEvidence.allowed).toBe(false);
  });

  it('allows explicitly scoped service actors', () => {
    const policy = TaskAccessService.policyForTaskRecord(privateTask, { scopes: ['actions:service'] });

    expect(policy.canViewEvidence.allowed).toBe(true);
    expect(policy.canSubmitEvidence.allowed).toBe(true);
  });
});
