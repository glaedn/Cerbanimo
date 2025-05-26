import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation, MemoryRouter } from 'react-router-dom';
import AuthWrapper from './AuthWrapper';

// Mock axios
jest.mock('axios');

// Mock useAuth0
jest.mock('@auth0/auth0-react');

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(), // Return the mock function itself
}));

// Mock environment variable
const mockApiUrl = 'http://localhost:4000';
process.env.REACT_APP_API_URL = mockApiUrl;

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
  const mockGetAccessTokenSilently = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(axios.post).toHaveBeenCalledWith(`${mockApiUrl}/auth/save-user`, expect.any(Object), expect.any(Object));
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`${mockApiUrl}/profile`, expect.any(Object));
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
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${mockApiUrl}/profile`, expect.any(Object)));
    expect(mockNavigate).not.toHaveBeenCalledWith('/onboarding');
    expect(mockNavigate).not.toHaveBeenCalled(); // General check
  });

  test('does NOT redirect if user needs onboarding but is already on /onboarding page', async () => {
    setupAuth0Mock(true, false);
    axios.get.mockResolvedValueOnce({ data: { skills: [], interests: [] } }); // Needs onboarding
    mockUseLocation.mockReturnValue({ pathname: '/onboarding' }); // Already on onboarding
    
    renderAuthWrapper('/onboarding');
    
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${mockApiUrl}/profile`, expect.any(Object)));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  
  test('calls save-user and then profile fetch on initial load for authenticated user', async () => {
    setupAuth0Mock(true, false);
    renderAuthWrapper();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${mockApiUrl}/auth/save-user`,
        expect.objectContaining({ sub: 'test-user-sub' }),
        expect.any(Object)
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `${mockApiUrl}/profile`,
        expect.objectContaining({ params: { sub: 'test-user-sub' } })
      );
    });
    // Based on default mock, should not redirect
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('initialSaveDone prevents repeated save-user calls but allows profile refetch if deps change (though not typical here)', async () => {
    setupAuth0Mock(true, false);
    const { rerender } = renderAuthWrapper();

    await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // Simulate a re-render, e.g., due to parent component or context change
    // Here, we directly call rerender with the same props for simplicity
    // In a real scenario, Auth0 state might change causing AuthWrapper to re-evaluate effects
    
    // To trigger the first useEffect again, we'd need its dependencies to change.
    // 'initialSaveDone' is designed to prevent the save-user call.
    // If isAuthenticated, user, or auth0Loading changed, it would re-run.
    // For this test, we mainly verify that if it *did* re-run, save-user isn't called again.

    // Let's slightly change a mock that affects the first useEffect, e.g., user object reference
    // This is a bit artificial for this component but demonstrates the initialSaveDone flag.
    const newUserObject = { ...useAuth0().user, newProp: true };
    useAuth0.mockReturnValue({
      ...useAuth0(),
      user: newUserObject, // New reference for user
    });
    
    // Forcing a re-render of the same structure
    // Note: This re-render won't naturally happen without a state/prop change in a real app.
    // We are testing the internal logic of the useEffect.
    rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
            <AuthWrapper>
                <TestComponent />
            </AuthWrapper>
        </MemoryRouter>
    );

    await waitFor(() => {
        // save-user should still only be called once due to initialSaveDone
        expect(axios.post).toHaveBeenCalledTimes(1); 
        // profile fetch might be called again if user object identity changes
        // and it's a dependency of the first useEffect.
        expect(axios.get).toHaveBeenCalledTimes(2); // Called again due to user identity change
    });
  });

});
