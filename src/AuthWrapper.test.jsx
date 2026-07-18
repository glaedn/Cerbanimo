import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { MemoryRouter } from 'react-router-dom';
import AuthWrapper from './AuthWrapper';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock useAuth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(),
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

const mockApiUrl = 'http://localhost:5000';

const TestComponent = () => <div>Test Content</div>;

const renderAuthWrapper = (initialPath = '/dashboard') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthWrapper>
        <TestComponent />
      </AuthWrapper>
    </MemoryRouter>
  );
};

describe('AuthWrapper', () => {
  const mockGetAccessTokenSilently = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_BACKEND_URL', mockApiUrl);
    sessionStorage.clear();
    mockGetAccessTokenSilently.mockResolvedValue('test-token');
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
    axios.post.mockResolvedValue({ data: { message: 'User saved' } });
    axios.get.mockResolvedValue({
      data: {
        id: 1,
        username: 'testuser',
        skills: [{ name: 'Skill1' }, { name: 'Skill2' }, { name: 'Skill3' }],
        interests: [{ name: 'Interest1' }, { name: 'Interest2' }, { name: 'Interest3' }],
      },
    });
  });

  const setupAuth0Mock = (isAuthenticated, isLoading, user = null) => {
    useAuth0.mockReturnValue({
      isAuthenticated,
      user: user || (isAuthenticated ? { sub: 'test-user-sub', email: 'test@example.com', name: 'Test User' } : null),
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isLoading,
    });
  };

  test('does not redirect if Auth0 is loading', async () => {
    setupAuth0Mock(false, true);
    renderAuthWrapper();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('does not redirect if user is not authenticated', async () => {
    setupAuth0Mock(false, false);
    renderAuthWrapper();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('redirects to the soft-onboarding profile when fewer than 3 skills exist', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({
      data: {
        id: 1, username: 'testuser',
        skills: [{ name: 'Skill1' }],
        interests: [{ name: 'Interest1' }, { name: 'Interest2' }, { name: 'Interest3' }],
      },
    });
    
    renderAuthWrapper();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });
  });

  test('redirects to the soft-onboarding profile when fewer than 3 interests exist', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({
      data: {
        id: 1, username: 'testuser',
        skills: [{ name: 'Skill1' }, { name: 'Skill2' }, { name: 'Skill3' }],
        interests: [{ name: 'Interest1' }],
      },
    });
    renderAuthWrapper();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile'));
  });
});
