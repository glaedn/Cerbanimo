import { describe, it, expect, vi, beforeEach } from 'vitest';
import AutomationWorkerService from './AutomationWorkerService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

vi.mock('./NotificationService.js', () => ({
  sendNotification: vi.fn()
}));

describe('AutomationWorkerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

