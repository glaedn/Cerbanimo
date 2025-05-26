import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBar from './StatusBar'; // Adjust path as necessary

// Mock the useUserProfile hook
jest.mock('../../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

// Import the hook to be able to change its mock implementation between tests
import { useUserProfile } from '../../../hooks/useUserProfile';

describe('StatusBar', () => {
  const mockProfileBase = {
    username: 'TestUser',
    tokens: 1000,
    // skills will be overridden in each test
  };

  afterEach(() => {
    // Clear mock usage after each test
    useUserProfile.mockClear();
  });

  test('renders loading state initially', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: true, error: null });
    render(<StatusBar />);
    expect(screen.getByText(/Loading Status.../i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: { message: 'Failed to load' } });
    render(<StatusBar />);
    expect(screen.getByText(/Error loading profile: Failed to load/i)).toBeInTheDocument();
  });

  test('renders "User data or skills unavailable" when profile or skills are missing', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: null });
    render(<StatusBar />);
    expect(screen.getByText(/User data or skills unavailable./i)).toBeInTheDocument();

    useUserProfile.mockReturnValue({ profile: { ...mockProfileBase, skills: null }, loading: false, error: null });
    render(<StatusBar />);
    expect(screen.getByText(/User data or skills unavailable./i)).toBeInTheDocument();
  });

  test('displays username and tokens correctly', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 0 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.getByText(mockProfileBase.username)).toBeInTheDocument();
    expect(screen.getByText((content, element) => content.includes(`Galactic Credits: ${mockProfileBase.tokens}`))).toBeInTheDocument();
  });

  test('calculates Level 1 with 0 totalGlobalExp', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 0 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.getByText(/Lvl: 1/i)).toBeInTheDocument();
    // XP: 0 / (40*(1)^2 - 40*(0)^2) = 0 / 40
    const progressBar = screen.getByTitle('0 / 40 XP').firstChild; // Get the inner div
    expect(progressBar).toHaveStyle('width: 0%');
    expect(progressBar.textContent).toBe('0 / 40 XP');
  });

  test('calculates Level 1 with 39 totalGlobalExp', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 39 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.getByText(/Lvl: 1/i)).toBeInTheDocument();
    // XP: 39 / 40
    const progressBar = screen.getByTitle('39 / 40 XP').firstChild;
    expect(progressBar).toHaveStyle('width: 97.5%'); // (39/40)*100
    expect(progressBar.textContent).toBe('39 / 40 XP');
  });

  test('calculates Level 2 with 40 totalGlobalExp', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 40 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.getByText(/Lvl: 2/i)).toBeInTheDocument();
    // Exp for Lvl 2 start: 40 * (2-1)^2 = 40
    // Exp for Lvl 3 start: 40 * (2)^2 = 160
    // Progress: (40 - 40) / (160 - 40) = 0 / 120
    const progressBar = screen.getByTitle('0 / 120 XP').firstChild;
    expect(progressBar).toHaveStyle('width: 0%');
    expect(progressBar.textContent).toBe('0 / 120 XP');
  });
  
  test('calculates Level 6 with 1000 totalGlobalExp', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 1000 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    // currentLevel = floor(sqrt(1000/40)) + 1 = floor(sqrt(25)) + 1 = 5 + 1 = 6
    expect(screen.getByText(/Lvl: 6/i)).toBeInTheDocument();
    // Exp for Lvl 6 start: 40 * (6-1)^2 = 40 * 25 = 1000
    // Exp for Lvl 7 start: 40 * (6)^2 = 40 * 36 = 1440
    // Progress: (1000 - 1000) / (1440 - 1000) = 0 / 440
    const progressBar = screen.getByTitle('0 / 440 XP').firstChild;
    expect(progressBar).toHaveStyle('width: 0%');
    expect(progressBar.textContent).toBe('0 / 440 XP');
  });

  test('calculates Level 6 with 1200 totalGlobalExp', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 1200 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.getByText(/Lvl: 6/i)).toBeInTheDocument();
    // Exp for Lvl 6 start: 1000
    // Exp for Lvl 7 start: 1440
    // Progress: (1200 - 1000) / (1440 - 1000) = 200 / 440
    const percentage = (200 / 440) * 100;
    const progressBar = screen.getByTitle('200 / 440 XP').firstChild;
    expect(progressBar).toHaveStyle(`width: ${percentage}%`);
    expect(progressBar.textContent).toBe('200 / 440 XP');
  });

  test('calculates level and XP correctly with multiple skills', () => {
    useUserProfile.mockReturnValue({ 
      profile: { 
        ...mockProfileBase, 
        skills: [
          { name: 'Piloting', experience: 500 }, 
          { name: 'Engineering', experience: 300 },
          { name: 'Combat', experience: 50 } // Total: 850
        ] 
      }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    // totalGlobalExp = 850
    // currentLevel = floor(sqrt(850/40)) + 1 = floor(sqrt(21.25)) + 1 = floor(4.6) + 1 = 4 + 1 = 5
    expect(screen.getByText(/Lvl: 5/i)).toBeInTheDocument();
    // Exp for Lvl 5 start: 40 * (5-1)^2 = 40 * 16 = 640
    // Exp for Lvl 6 start: 40 * (5)^2 = 40 * 25 = 1000
    // Progress: (850 - 640) / (1000 - 640) = 210 / 360
    const percentage = (210 / 360) * 100;
    const progressBar = screen.getByTitle('210 / 360 XP').firstChild;
    expect(progressBar).toHaveStyle(`width: ${percentage}%`);
    expect(progressBar.textContent).toBe('210 / 360 XP');
  });

  test('does not render the notifications section', () => {
    useUserProfile.mockReturnValue({ 
      profile: { ...mockProfileBase, skills: [{ name: 'Piloting', experience: 0 }] }, 
      loading: false, 
      error: null 
    });
    render(<StatusBar />);
    expect(screen.queryByText(/\[N\]/i)).not.toBeInTheDocument(); // Check for notification icon
  });
});
