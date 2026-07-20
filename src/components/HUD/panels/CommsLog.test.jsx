import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CommsLog from './CommsLog';

const mocks = vi.hoisted(() => ({
  notifications: [],
  selectEntity: vi.fn(),
}));

vi.mock('../../../pages/NotificationProvider', () => ({
  useNotifications: () => ({ notifications: mocks.notifications }),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector) => selector({ selectEntity: mocks.selectEntity }),
}));

describe('CommsLog', () => {
  beforeEach(() => {
    mocks.notifications = [];
    mocks.selectEntity.mockClear();
  });

  test('renders the panel title and empty state', () => {
    render(<CommsLog />);
    expect(screen.getByRole('heading', { name: /Comms Log/i })).toBeInTheDocument();
    expect(screen.getByText('No new activity.')).toBeInTheDocument();
  });

  test('renders a loading state when notification context is unresolved', () => {
    mocks.notifications = undefined;
    render(<CommsLog />);
    expect(screen.getByText('Loading comms...')).toBeInTheDocument();
  });

  test('renders every durable notification from the provider', () => {
    mocks.notifications = [
      { id: 'one', type: 'task-approved', messageText: 'The review council approved the offering.' },
      { id: 'two', type: 'task-rejected', messageText: 'The council requested more evidence.' },
      { id: 'three', type: 'task', messageText: 'A dependency opened.' },
      { id: 'four', type: 'default', messageText: 'The chronicle advanced.' },
    ];
    render(<CommsLog />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('The chronicle advanced.')).toBeInTheDocument();
  });

  test('selects the referenced project or task from a notification', () => {
    mocks.notifications = [{
      id: 'task-event',
      type: 'task',
      projectId: 7,
      taskId: 19,
      messageText: 'A sealed path opened.',
    }];
    render(<CommsLog />);
    fireEvent.click(screen.getByText('A sealed path opened.'));
    expect(mocks.selectEntity).toHaveBeenCalledWith({
      id: 'task-19',
      type: 'task',
      name: 'A sealed path opened.',
      status: 'active',
    });
  });

  test('minimizes and restores the activity list', () => {
    mocks.notifications = [{ id: 'one', type: 'default', messageText: 'Visible event.' }];
    render(<CommsLog />);
    const minimize = screen.getByRole('button', { name: /minimize/i });
    expect(screen.getByRole('list')).toBeVisible();
    fireEvent.click(minimize);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByRole('list')).toBeVisible();
  });
});
