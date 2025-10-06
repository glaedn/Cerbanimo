import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandDeck from './CommandDeck'; // Adjust path as necessary

// Mock hooks
jest.mock('../../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));
jest.mock('../../../hooks/useUserIntentions', () => jest.fn());

// Import hooks to change their mock implementation
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions';

// Mock constants from CommandDeck if they affect tests and are not easily controlled otherwise
// For MOCKED_TOKEN_POOL and MOCK_INTENTION_TOKENS, the component's internal values will be used.
// We can test their effect by controlling the hook return values.

describe('CommandDeck', () => {
  const mockProfileBase = {
    username: 'TestUser',
    // token_pool will be varied
  };

  let consoleWarnMock;

  beforeEach(() => {
    // Mock console.warn to check for warnings about mocked data
    consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useUserProfile.mockClear();
    useUserIntentions.mockClear();
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
  });

  test('renders loading state initially', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: true, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: true, error: null });
    render(<CommandDeck />);
    expect(screen.getByText(/Loading Commmand Deck.../i)).toBeInTheDocument();
  });

  test('renders error state if profile loading fails', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: { message: 'Profile fail' } });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: null });
    render(<CommandDeck />);
    expect(screen.getByText(/Error loading profile data/i)).toBeInTheDocument();
  });

  test('renders error state if intentions loading fails', () => {
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: { message: 'Intentions fail' } });
    render(<CommandDeck />);
    expect(screen.getByText(/Error loading intention data/i)).toBeInTheDocument();
  });

  test('renders panel title "Command Deck (Managed Intentions)"', () => {
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: null });
    render(<CommandDeck />);
    expect(screen.getByRole('heading', { name: /Command Deck \(Managed Intentions\)/i })).toBeInTheDocument();
  });

  test('renders intention list when intentions are available', () => {
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({
      intentions: [
        { id: 'i1', name: 'Intention 1', taskCount: 5, activeTasks: 2, completedTasks: 3, progress: 60, token_pool: 100, used_tokens: 20, reserved_tokens: 30 },
      ],
      loading: false, 
      error: null 
    });
    render(<CommandDeck />);
    expect(screen.getByText('Intention 1')).toBeInTheDocument();
    expect(screen.getByText(/Tasks: 5/)).toBeInTheDocument();
  });

  test('renders "No intentions currently managed." when no intentions are available', () => {
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: null });
    render(<CommandDeck />);
    expect(screen.getByText('No intentions currently managed.')).toBeInTheDocument();
  });

  test('panel minimization works correctly', () => {
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: null });
    render(<CommandDeck />);
    
    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    let content = screen.getByText('No intentions currently managed.');

    expect(content).toBeVisible();

    fireEvent.click(minimizeButton);
    expect(screen.queryByText('No intentions currently managed.')).not.toBeVisible();
    
    expect(screen.getByRole('heading', { name: /Command Deck \(Managed Intentions\)/i })).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', /expand/i);

    fireEvent.click(minimizeButton);
    expect(screen.getByText('No intentions currently managed.')).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', /minimize/i);
  });
});