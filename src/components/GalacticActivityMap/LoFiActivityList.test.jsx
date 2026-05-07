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

test('resets indentation depth after 4 levels', () => {
  const deepMockData = [
    { id: 'l1', type: 'community', name: 'L1', status: 'active', lastActivity: new Date().toISOString() },
    { id: 'l2', type: 'project', name: 'L2', status: 'active', lastActivity: new Date().toISOString(), parentId: 'l1' },
    { id: 'l3', type: 'task', name: 'L3', status: 'active', lastActivity: new Date().toISOString(), parentId: 'l2' },
    { id: 'l4', type: 'subtask', name: 'L4', status: 'active', lastActivity: new Date().toISOString(), parentId: 'l3' },
    { id: 'l5', type: 'resource', name: 'L5', status: 'active', lastActivity: new Date().toISOString(), parentId: 'l4' },
  ];

  render(
    <MemoryRouter>
      <LoFiActivityList starData={deepMockData} />
    </MemoryRouter>
  );

  // Expand all levels
  fireEvent.click(screen.getByText('L1').closest('.lofi-item-content'));
  fireEvent.click(screen.getByText('L2').closest('.lofi-item-content'));
  fireEvent.click(screen.getByText('L3').closest('.lofi-item-content'));
  fireEvent.click(screen.getByText('L4').closest('.lofi-item-content'));

  const item1 = screen.getByText('L1').closest('.lofi-item-container');
  const item5 = screen.getByText('L5').closest('.lofi-item-container');

  // L1 is at depth 0, marginLeft should be 0px
  expect(item1.style.marginLeft).toBe('0px');

  // L5 is at depth 4, depth % 4 = 0, marginLeft should be 0px
  expect(item5.style.marginLeft).toBe('0px');

  const item4 = screen.getByText('L4').closest('.lofi-item-container');
  // L4 is at depth 3, depth % 4 = 3, marginLeft should be 3 * 15 = 45px
  expect(item4.style.marginLeft).toBe('45px');
});
