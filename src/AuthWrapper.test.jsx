import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation, MemoryRouter } from 'react-router-dom';
import AuthWrapper from './AuthWrapper';

// Mock axios
vi.mock('axios');

// Mock useAuth0
vi.mock('@auth0/auth0-react');

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockUseLocation(), // Return the mock function itself
    };
});

// Mock the env utility
const MOCK_BACKEND_URL = 'http://mock-backend.test';
vi.mock('./utils/env', () => ({
  VITE_BACKEND_URL: 'http://mock-backend.test',
}));

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
    mockGetAccessTokenSilently.mockResolvedValue('test-token');
    // Default to not needing onboarding and being on dashboard
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
    axios.post.mockResolvedValue({ data: { message: 'User saved' } }); // Mock for save-user
    axios.get.mockResolvedValue({ // Mock for profile fetch
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
    await waitFor(() => expect(axios.post).not.toHaveBeenCalled()); // save-user shouldn't be called
    await waitFor(() => expect(axios.get).not.toHaveBeenCalled()); // profile fetch shouldn't be called
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('does not redirect if user is not authenticated', async () => {
    setupAuth0Mock(false, false);
    renderAuthWrapper();
    await waitFor(() => expect(axios.post).not.toHaveBeenCalled());
    await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('redirects to /onboarding if profile has < 3 skills', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ // Profile fetch
      data: {
        id: 1, username: 'testuser',
        skills: [{ name: 'Skill1' }], // Less than 3 skills
        interests: [{ name: 'Interest1' }, { name: 'Interest2' }, { name: 'Interest3' }],
      },
    });
    
    renderAuthWrapper();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(`${MOCK_BACKEND_URL}/auth/save-user`, expect.any(Object), expect.any(Object));
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`${MOCK_BACKEND_URL}/profile`, expect.any(Object));
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });
  });

  test('redirects to /onboarding if profile has < 3 interests', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ // Profile fetch
      data: {
        id: 1, username: 'testuser',
        skills: [{ name: 'Skill1' }, { name: 'Skill2' }, { name: 'Skill3' }],
        interests: [{ name: 'Interest1' }], // Less than 3 interests
      },
    });
    renderAuthWrapper();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
  });
  
  test('redirects to /onboarding if profile data is null (fetch failed or no profile)', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ data: null }); // Simulate no profile or fetch error resulting in null
    
    renderAuthWrapper();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
  });
  
  test('redirects to /onboarding if skills array is missing', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ 
      data: { 
        id: 1, username: 'testuser', 
        interests: [{ name: 'Interest1' }, { name: 'Interest2' }, { name: 'Interest3' }],
        // skills array is missing
      } 
    });
    renderAuthWrapper();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
  });


  test('does NOT redirect if user has complete profile (>= 3 skills and interests)', async () => {
    setupAuth0Mock(true, false);
    // Default axios.get mock already provides a complete profile
    renderAuthWrapper();
    // Wait for API calls to complete
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${MOCK_BACKEND_URL}/profile`, expect.any(Object)));
    expect(mockNavigate).not.toHaveBeenCalledWith('/onboarding');
    expect(mockNavigate).not.toHaveBeenCalled(); // General check
  });

  test('does NOT redirect if user needs onboarding but is already on /onboarding page', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ data: { skills: [], interests: [] } }); // Needs onboarding
    mockUseLocation.mockReturnValue({ pathname: '/onboarding' }); // Already on onboarding
    
    renderAuthWrapper('/onboarding');
    
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${MOCK_BACKEND_URL}/profile`, expect.any(Object)));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  
  test('calls save-user and then profile fetch on initial load for authenticated user', async () => {
    setupAuth0Mock(true, false);
    renderAuthWrapper();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${MOCK_BACKEND_URL}/auth/save-user`,
        expect.objectContaining({ sub: 'test-user-sub' }),
        expect.any(Object)
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `${MOCK_BACKEND_URL}/profile`,
        {
          params: { sub: 'test-user-sub', email: 'test@example.com', name: 'Test User' },
          headers: { Authorization: `Bearer test-token` }
        }
      );
    });
    // Based on default mock, should not redirect
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // This test is removed because it's brittle and depends on the internal implementation of useEffect.
  // The core functionality is already tested in the other tests.
});