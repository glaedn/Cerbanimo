import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CommandDeck from './CommandDeck';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects';

const mocks = vi.hoisted(() => ({ selectEntity: vi.fn() }));

vi.mock('../../../hooks/useUserProfile', () => ({ useUserProfile: vi.fn() }));
vi.mock('../../../hooks/useUserProjects', () => ({ default: vi.fn() }));
vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector) => selector({ selectEntity: mocks.selectEntity }),
}));
vi.mock('../../ChronicleTimeline', () => ({
  default: ({ stories }) => <div data-testid="chronicle">Chronicle entries: {stories.length}</div>,
}));

function arrange({ profile = { username: 'TestUser' }, projects = [], profileLoading = false, projectsLoading = false, profileError = null, projectsError = null } = {}) {
  useUserProfile.mockReturnValue({ profile, loading: profileLoading, error: profileError });
  useUserProjects.mockReturnValue({ projects, loading: projectsLoading, error: projectsError });
}

describe('CommandDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrange();
  });

  test.each([
    ['profile', { profileLoading: true }],
    ['projects', { projectsLoading: true }],
  ])('renders loading state while %s data resolves', (_label, state) => {
    arrange(state);
    render(<CommandDeck />);
    expect(screen.getByText('Loading Commmand Deck...')).toBeInTheDocument();
  });

  test.each([
    ['profile', { profileError: new Error('Profile failed') }, /Error loading profile data/],
    ['projects', { projectsError: new Error('Projects failed') }, /Error loading project data/],
  ])('renders a bounded %s error', (_label, state, message) => {
    arrange(state);
    render(<CommandDeck />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test('renders the managed-project heading and empty state', () => {
    render(<CommandDeck />);
    expect(screen.getByRole('heading', { name: 'Command Deck (Managed Projects)' })).toBeInTheDocument();
    expect(screen.getByText('No projects currently managed.')).toBeInTheDocument();
  });

  test('renders authoritative project metrics without invented token defaults', () => {
    arrange({ projects: [{ id: 7, name: 'Harbor Ward', taskCount: 8, activeTasks: 3, completedTasks: 5, token_pool: 5000, used_tokens: 100, reserved_tokens: 50, progress: 62 }] });
    render(<CommandDeck />);
    expect(screen.getByText('Harbor Ward')).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('Tasks: 8') && text.includes('credits: 4850'))).toBeInTheDocument();
    expect(screen.getByText('62%')).toHaveStyle({ width: '62%' });
  });

  test('treats absent used and reserved balances as zero', () => {
    arrange({ projects: [{ id: 8, name: 'Open Ledger', taskCount: 1, activeTasks: 1, completedTasks: 0, token_pool: 700, progress: 0 }] });
    render(<CommandDeck />);
    expect(screen.getByText((text) => text.includes('credits: 700'))).toBeInTheDocument();
  });

  test('selects the exact project represented by a row', () => {
    const project = { id: 9, name: 'Glass Observatory', taskCount: 2, activeTasks: 1, completedTasks: 1, token_pool: 100, progress: 50 };
    arrange({ projects: [project] });
    render(<CommandDeck />);
    fireEvent.click(screen.getByText(project.name));
    expect(mocks.selectEntity).toHaveBeenCalledWith({ id: 'project-9', type: 'project', name: project.name, status: 'active', raw: project });
  });

  test('surfaces a project task-fetch error without hiding the project', () => {
    arrange({ projects: [{ id: 10, name: 'Faulted Beacon', taskCount: 0, activeTasks: 0, completedTasks: 0, token_pool: 0, progress: 0, errorFetchingTasks: true }] });
    render(<CommandDeck />);
    expect(screen.getByText('Faulted Beacon')).toBeInTheDocument();
    expect(screen.getByText(/Error loading project tasks/)).toBeInTheDocument();
  });

  test('keeps the chronicle preview mounted in the expanded deck', () => {
    render(<CommandDeck />);
    expect(screen.getByTestId('chronicle')).toHaveTextContent('Chronicle entries: 0');
  });

  test('minimizes and restores the command deck', () => {
    render(<CommandDeck />);
    fireEvent.click(screen.getByRole('button', { name: /Minimize Galactic Treasury/i }));
    expect(screen.queryByText('No projects currently managed.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Expand Galactic Treasury/i }));
    expect(screen.getByText('No projects currently managed.')).toBeVisible();
  });
});
