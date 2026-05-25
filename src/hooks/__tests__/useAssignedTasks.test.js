import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useAssignedTasks from '../useAssignedTasks';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

vi.mock('axios');
vi.mock('@auth0/auth0-react');

describe('useAssignedTasks', () => {
  const mockGetAccessTokenSilently = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth0.mockReturnValue({
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isAuthenticated: true,
    });
    mockGetAccessTokenSilently.mockResolvedValue('fake-token');
  });

  it('should fetch and map assigned tasks correctly', async () => {
    const mockTasks = [
      {
        id: 1,
        name: 'Task 1',
        status: 'active',
        project_name: 'Project A',
        project_id: 10,
        reward_tokens: 100,
        due_date: '2025-12-31T23:59:59Z',
      }
    ];

    axios.get.mockResolvedValue({ data: mockTasks });

    const { result } = renderHook(() => useAssignedTasks(1));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.assignedTasks).toHaveLength(1);
    const task = result.current.assignedTasks[0];
    expect(task.id).toBe(1);
    expect(task.reward_tokens).toBe(100);
    expect(task.due_date).toBe('2025-12-31T23:59:59Z');
    expect(task.deadline).toBe('2025-12-31T23:59:59Z');
  });
});
