import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StatusBar from './StatusBar';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useCapabilityData from '../../../hooks/useCapabilityData';
import { useAuth0 } from '@auth0/auth0-react';

// Mock all required hooks
vi.mock('../../../hooks/useUserProfile');
vi.mock('../../../hooks/useCapabilityData');
vi.mock('@auth0/auth0-react');

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('StatusBar', () => {
  const mockProfile = {
    id: 1,
    username: 'TestUser',
    tokens: 1000,
  };

  const mockCapabilities = [
    {
      id: 1,
      name: 'Piloting',
      unlocked_users: [
        { user_id: 1, experience: 500 },
        { user_id: 2, experience: 100 },
      ],
    },
    {
      id: 2,
      name: 'Engineering',
      unlocked_users: [
        { user_id: 1, experience: 350 },
      ],
    },
  ]; // Total XP for user 1 = 850

  beforeEach(() => {
    // Reset mocks before each test
    useUserProfile.mockClear();
    useCapabilityData.mockClear();
    useAuth0.mockClear();

    // Default successful mock state
    useUserProfile.mockReturnValue({ profile: mockProfile, loading: false, error: null });
    useCapabilityData.mockReturnValue({ allCapabilities: mockCapabilities, loading: false, error: null });
    useAuth0.mockReturnValue({ isAuthenticated: true, user: { sub: 'auth0|123' } });
  });

  test('renders loading state when profile is loading', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: true, error: null });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(/Loading Status.../i)).toBeInTheDocument();
  });

  test('renders loading state when capabilities are loading', () => {
    useCapabilityData.mockReturnValue({ allCapabilities: [], loading: true, error: null });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(/Loading Status.../i)).toBeInTheDocument();
  });

  test('renders error state if profile loading fails', () => {
    const error = { message: 'Profile fetch failed' };
    useUserProfile.mockReturnValue({ profile: null, loading: false, error });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(`Error: ${error.message}`)).toBeInTheDocument();
  });

  test('renders error state if capabilities loading fails', () => {
    const error = { message: 'Capabilities fetch failed' };
    useCapabilityData.mockReturnValue({ allCapabilities: [], loading: false, error });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(`Error: ${error.message}`)).toBeInTheDocument();
  });

  test('renders unavailable message if profile is missing', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: null });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(/User data, capabilities, or authentication unavailable./i)).toBeInTheDocument();
  });

  test('renders unavailable message if not authenticated', () => {
    useAuth0.mockReturnValue({ isAuthenticated: false, user: null });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText(/User data, capabilities, or authentication unavailable./i)).toBeInTheDocument();
  });

  test('displays username and tokens correctly', () => {
    renderWithRouter(<StatusBar />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText(/Galactic Credits:/i)).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  test('calculates level and XP correctly based on capabilities', () => {
    // With totalGlobalExp = 850 (from mockCapabilities for user 1)
    // Level should be 5: floor(sqrt(850/40)) + 1 = floor(4.6) + 1 = 5
    // XP for Lvl 5 start: 40 * (5-1)^2 = 640
    // XP for Lvl 6 start: 40 * (5)^2 = 1000
    // Progress: 850 - 640 = 210
    // Needed: 1000 - 640 = 360
    renderWithRouter(<StatusBar />);
    expect(screen.getByText('Lvl: 5')).toBeInTheDocument();
    const progressBar = screen.getByTitle('210 / 360 XP');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle(`width: ${ (210 / 360) * 100 }%`);
    expect(progressBar.textContent).toBe('210 / 360 XP');
  });

  test('handles zero experience correctly', () => {
    useCapabilityData.mockReturnValue({
      allCapabilities: [ { id: 1, name: 'Piloting', unlocked_users: [ { user_id: 1, experience: 0 } ] } ],
      loading: false,
      error: null
    });
    renderWithRouter(<StatusBar />);
    expect(screen.getByText('Lvl: 1')).toBeInTheDocument();
    const progressBar = screen.getByTitle('0 / 40 XP');
    expect(progressBar).toHaveStyle('width: 0%');
    expect(progressBar.textContent).toBe('0 / 40 XP');
  });
});