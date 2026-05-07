/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoFiActivityList from './LoFiActivityList';
import { expect, test, afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

const mockStarData = [
  { id: 'community-1', type: 'community', name: 'Community A', status: 'active', lastActivity: new Date().toISOString() },
  { id: 'project-1', type: 'project', name: 'Project B', status: 'active', lastActivity: new Date().toISOString(), parentId: 'community-1' },
  { id: 'task-1', type: 'task', name: 'Task C', status: 'urgent', lastActivity: new Date().toISOString(), parentId: 'project-1' },
  { id: 'community-2', type: 'community', name: 'Community D', status: 'active', lastActivity: new Date(Date.now() - 86400000).toISOString() }
];

test('renders LoFiActivityList and identifies root nodes', () => {
  render(
    <MemoryRouter>
      <LoFiActivityList starData={mockStarData} />
    </MemoryRouter>
  );

  expect(screen.getByText('Community A')).toBeDefined();
  expect(screen.getByText('Community D')).toBeDefined();
  // Project B should not be visible initially as it is a child
  expect(screen.queryByText('Project B')).toBeNull();
});

test('sorts root nodes by relevance/activity', () => {
  render(
    <MemoryRouter>
      <LoFiActivityList starData={mockStarData} />
    </MemoryRouter>
  );

  const items = screen.getAllByText(/Community [AD]/);
  // Community A is more recent, should be first
  expect(items[0].textContent).toBe('Community A');
  expect(items[1].textContent).toBe('Community D');
});

test('expands children when clicked', () => {
  render(
    <MemoryRouter>
      <LoFiActivityList starData={mockStarData} />
    </MemoryRouter>
  );

  const communityA = screen.getByText('Community A').closest('.lofi-item-content');
  fireEvent.click(communityA);

  expect(screen.getByText('Project B')).toBeDefined();
});
