import { describe, it, expect, vi, beforeEach } from 'vitest';
import AutomationWorkerService from './AutomationWorkerService.js';
import pool from '../db.js';
import { qualityCheckInputSchema } from './TaskAutomationInputValidator.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

vi.mock('./NotificationService.js', () => ({
  sendNotification: vi.fn()
}));

describe('AutomationWorkerService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('returns blocked results for external integrations without credentials', async () => {
    const result = await AutomationWorkerService.dispatch({
      template_key: 'github_issue_creation',
      input: { title: 'Create issue' }
    });

    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('external_integration_not_configured');
    expect(result.requiredConfiguration).toContain('GITHUB_TOKEN');
  });

  it('runs project quality checks from Cerbanimo data', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 10, name: 'Test Project', description: 'Build something' }]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Done', status: 'completed', dependencies: [], due_date: null, assigned_user_ids: [] },
          { id: 2, name: 'Late', status: 'active-assigned', dependencies: [], due_date: '2020-01-01', assigned_user_ids: [1] }
        ]
      });

    const result = await AutomationWorkerService.runQualityChecks({
      input: { targetType: 'project', targetId: 10 }
    });

    expect(result.status).toBe('completed');
    expect(result.passed).toBe(false);
    expect(result.stats.taskCount).toBe(2);
    expect(result.findings[0].type).toBe('overdue_tasks');
  });

  it('submits a task when deterministic prepared quality checks pass', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_quality';
    process.env.CERBANIMO_QUALITY_CHECK_EXECUTOR = 'deterministic';

    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 5,
          task_id: 99,
          actor_user_id: 42,
          input_schema_snapshot: qualityCheckInputSchema(),
          input_values: {
            repository: 'glaedn/Kamiya',
            ref: 'main',
            checkProfile: 'node_standard',
            approval: { approved: true }
          },
          task_name: 'Run baseline repository quality checks',
          task_status: 'active-unassigned',
          project_id: 7
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await AutomationWorkerService.runPreparedQualityChecks({
      id: 77,
      run_uuid: '11111111-1111-4111-8111-111111111111',
      input: { preparationId: 5 },
      actor_user_id: 42
    });

    expect(result.status).toBe('checks_passed');
    expect(result.submittedTask).toBe(true);
    expect(pool.query.mock.calls[1][0]).toContain("status = 'submitted'");
    expect(pool.query.mock.calls[1][1][0]).toBe(99);
  });
});
