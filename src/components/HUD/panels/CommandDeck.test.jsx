import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CommandDeck from './CommandDeck';

// Mock hooks
vi.mock('../../../hooks/useUserProfile');
vi.mock('../../../hooks/useUserIntentions');

import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions';

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('CommandDeck', () => {
  const mockProfileBase = {
    username: 'TestUser',
  };

  let consoleWarnMock;

  beforeEach(() => {
    consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useUserProfile.mockClear();
    useUserIntentions.mockClear();

    // Default mock implementations
    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, token_pool: 1000 }, loading: false, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: null });
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
  });

  test('renders loading state initially', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: true, error: null });
    useUserIntentions.mockReturnValue({ intentions: [], loading: true, error: null });
    renderWithRouter(<CommandDeck />);
    expect(screen.getByText(/Loading Commmand Deck.../i)).toBeInTheDocument();
  });

  test('renders error state if profile loading fails', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: { message: 'Profile fail' } });
    renderWithRouter(<CommandDeck />);
    expect(screen.getByText(/Error loading profile data/i)).toBeInTheDocument();
  });

  test('renders error state if intentions loading fails', () => {
    useUserIntentions.mockReturnValue({ intentions: [], loading: false, error: { message: 'Intentions fail' } });
    renderWithRouter(<CommandDeck />);
    expect(screen.getByText(/Error loading intention data/i)).toBeInTheDocument();
  });

  test('renders panel title "Command Deck (Managed Intentions)"', () => {
    renderWithRouter(<CommandDeck />);
    expect(screen.getByRole('heading', { name: /Command Deck \(Managed Intentions\)/i })).toBeInTheDocument();
  });

  test('renders intention list when intentions are available', () => {
    useUserIntentions.mockReturnValue({
      intentions: [
        { id: 'i1', name: 'Intention 1', petalCount: 5, activePetals: 2, completedPetals: 3, progress: 60, token_pool: 100, used_tokens: 20, reserved_tokens: 30 },
      ],
      loading: false, 
      error: null 
    });
    renderWithRouter(<CommandDeck />);
    expect(screen.getByText('Intention 1')).toBeInTheDocument();
    expect(screen.getByText(/Petals: 5/)).toBeInTheDocument();
  });

  test('renders "No intentions currently managed." when no intentions are available', () => {
    renderWithRouter(<CommandDeck />);
    expect(screen.getByText('No intentions currently managed.')).toBeInTheDocument();
  });

  test('panel minimization works correctly', () => {
    renderWithRouter(<CommandDeck />);
    
    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    let content = screen.getByText('No intentions currently managed.');

    expect(content).toBeVisible();

    fireEvent.click(minimizeButton);
    expect(screen.queryByText('No intentions currently managed.')).not.toBeInTheDocument();
    
    expect(screen.getByRole('heading', { name: /Command Deck \(Managed Intentions\)/i })).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', 'Expand Galactic Treasury');

    fireEvent.click(minimizeButton);
    expect(screen.getByText('No intentions currently managed.')).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', 'Minimize Galactic Treasury');
  });
});