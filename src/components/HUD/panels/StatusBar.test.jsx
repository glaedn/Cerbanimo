import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import StatusBar from './StatusBar';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useSkillData from '../../../hooks/useSkillData';

const mocks = vi.hoisted(() => ({
  crisis: false,
  lofi: false,
  toggleCrisis: vi.fn(),
  toggleLofi: vi.fn(),
  audioTrigger: vi.fn(),
  auth: { isAuthenticated: true, user: { sub: 'auth0|test' } },
}));

vi.mock('../../../hooks/useUserProfile', () => ({ useUserProfile: vi.fn() }));
vi.mock('../../../hooks/useSkillData', () => ({ default: vi.fn() }));
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => mocks.auth }));
vi.mock('../../../context/CrisisContext', () => ({ useCrisis: () => ({ isCrisisMode: mocks.crisis, toggleCrisisMode: mocks.toggleCrisis }) }));
vi.mock('../../../context/LoFiContext', () => ({ useLoFi: () => ({ isLoFiMode: mocks.lofi, toggleLoFiMode: mocks.toggleLofi }) }));
vi.mock('../../../audio/AudioEngine', () => ({ audioEngine: { trigger: mocks.audioTrigger } }));

function skillExperience(experience, userId = 1) {
  return { id: `skill-${experience}`, unlocked_users: [{ user_id: userId, experience }] };
}

function arrange({ profile = { id: 1, username: 'TestUser', tokens: 1000 }, skills = [], profileLoading = false, skillsLoading = false, profileError = null, skillsError = null } = {}) {
  useUserProfile.mockReturnValue({ profile, loading: profileLoading, error: profileError });
  useSkillData.mockReturnValue({ allSkills: skills, loading: skillsLoading, error: skillsError });
}

describe('StatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.crisis = false;
    mocks.lofi = false;
    mocks.auth = { isAuthenticated: true, user: { sub: 'auth0|test' } };
    arrange();
  });

  test.each([
    ['profile', { profileLoading: true }],
    ['skills', { skillsLoading: true }],
  ])('renders loading state while %s data resolves', (_label, state) => {
    arrange(state);
    render(<StatusBar />);
    expect(screen.getByText('Loading Status...')).toBeInTheDocument();
  });

  test.each([
    ['profile', { profileError: new Error('Profile failed') }, 'Error: Profile failed'],
    ['skills', { skillsError: new Error('Skills failed') }, 'Error: Skills failed'],
  ])('renders the %s error', (_label, state, message) => {
    arrange(state);
    render(<StatusBar />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test('shows only safe controls when the viewer is unauthenticated', () => {
    mocks.auth = { isAuthenticated: false, user: null };
    render(<StatusBar />);
    expect(screen.queryByText('TestUser')).not.toBeInTheDocument();
    expect(screen.getByText('LO_FI')).toBeInTheDocument();
  });

  test('displays the current username and server balance', () => {
    render(<StatusBar />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Galactic Credits:').parentElement).toHaveTextContent('Galactic Credits: 1000');
  });

  test.each([
    [0, 1, '0 / 40 XP', '0%'],
    [39, 1, '39 / 40 XP', '97.5%'],
    [40, 2, '0 / 120 XP', '0%'],
    [1000, 6, '0 / 440 XP', '0%'],
    [1200, 6, '200 / 440 XP', `${(200 / 440) * 100}%`],
  ])('maps %i total XP to level %i', (xp, level, title, width) => {
    arrange({ skills: [skillExperience(xp)] });
    render(<StatusBar />);
    expect(screen.getByText(`Lvl: ${level}`)).toBeInTheDocument();
    expect(screen.getByTitle(title)).toHaveStyle({ width });
  });

  test('sums experience only for the active profile', () => {
    arrange({ skills: [skillExperience(30), skillExperience(10), skillExperience(999, 2)] });
    render(<StatusBar />);
    expect(screen.getByText('Lvl: 2')).toBeInTheDocument();
    expect(screen.getByTitle('0 / 120 XP')).toBeInTheDocument();
  });

  test('toggles crisis mode and cues audio', () => {
    render(<StatusBar />);
    fireEvent.click(screen.getByText('CRISIS_MODE'));
    expect(mocks.toggleCrisis).toHaveBeenCalledOnce();
    expect(mocks.audioTrigger).toHaveBeenCalledWith('ui.toggle_on');
  });

  test('toggles low-fi mode and cues audio', () => {
    render(<StatusBar />);
    fireEvent.click(screen.getByText('LO_FI'));
    expect(mocks.toggleLofi).toHaveBeenCalledOnce();
    expect(mocks.audioTrigger).toHaveBeenCalledWith('ui.toggle_on');
  });
});
