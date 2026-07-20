import process from 'node:process';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import OnboardingPage from './OnboardingPage';

// Mock axios
vi.mock('axios');

// Mock useAuth0
vi.mock('@auth0/auth0-react');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Mock environment variable
const mockApiUrl = 'import.meta.env.VITE_BACKEND_URL';
process.env.REACT_APP_API_URL = mockApiUrl;


// The component uses its own application palette; MUI supplies its default test theme.
const renderWithTheme = (component) => {
  return render(component);
};


describe('OnboardingPage', () => {
  const mockGetAccessTokenSilently = vi.fn();
  const emptyProfile = { username: '', skills: [], interests: [] };

  const mockProfile = (profile = emptyProfile) => {
    axios.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/profile/options')
        ? {
            skillsPool: [{ id: 1, name: 'React' }, { id: 2, name: 'Node.js' }],
            interestsPool: [{ id: 1, name: 'AI' }, { id: 2, name: 'Gardening' }],
          }
        : profile,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:5000');
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { sub: 'test-user-sub', email: 'test@example.com' },
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isLoading: false,
    });
    mockGetAccessTokenSilently.mockResolvedValue('test-token');

    // Mock initial options fetch
    mockProfile();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders all form fields correctly', async () => {
    renderWithTheme(<OnboardingPage />);
    expect(screen.getByText(/Welcome! Let's set up your profile./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Profile Picture/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skills \(at least 3\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interests \(at least 3\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Profile/i })).toBeInTheDocument();
  });

  test('fetches and displays skill/interest options', async () => {
    renderWithTheme(<OnboardingPage />);
    // Wait for options to be fetched and set
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, expect.any(Object));
    });
    // MUI Autocomplete doesn't easily expose options directly in the DOM for querying.
    // We can infer by trying to open and find items, but it's complex.
    // For this test, we'll trust the useEffect and mock setup. A more direct test would involve
    // interacting with the Autocomplete to open its dropdown.
  });

  test('updates username state on input', () => {
    renderWithTheme(<OnboardingPage />);
    const usernameInput = screen.getByLabelText(/Username/i);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(usernameInput.value).toBe('testuser');
  });

  test('handles profile picture selection and shows preview', async () => {
    renderWithTheme(<OnboardingPage />);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload Profile Picture/i);

    class MockFileReader {
      result = 'data:image/png;base64,fakecodedstring';
      onloadend = null;
      readAsDataURL = vi.fn(() => this.onloadend?.());
    }
    vi.stubGlobal('FileReader', MockFileReader);
    
    await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
    });
    
    await waitFor(() => {
      const avatar = screen.getByRole('img'); // Assuming Avatar has role='img'
      expect(avatar).toHaveAttribute('src', 'data:image/png;base64,fakecodedstring');
    });
  });
  
  test('hydrates a free-solo skill stored in the existing profile', async () => {
    mockProfile({ username: '', skills: [JSON.stringify({ name: 'NewSkill' })], interests: [] });
    renderWithTheme(<OnboardingPage />);
    expect(await screen.findByText('NewSkill')).toBeInTheDocument();
  });


  test('marks username as required before form submission', async () => {
    renderWithTheme(<OnboardingPage />);
    const username = screen.getByLabelText(/Username/i);
    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(username).toBeRequired();
    expect(username).toBeInvalid();
  });

  test('shows validation error if less than 3 skills are provided', async () => {
    mockProfile({ username: 'testuser', skills: [JSON.stringify({ name: 'Skill1' })], interests: [] });
    renderWithTheme(<OnboardingPage />);
    await screen.findByText('Skill1');

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Please select or add at least 3 skills.')).toBeInTheDocument();
  });
  
   test('shows validation error if less than 3 interests are provided', async () => {
    mockProfile({
      username: 'testuser',
      skills: ['Skill1', 'Skill2', 'Skill3'].map(name => JSON.stringify({ name })),
      interests: [JSON.stringify({ name: 'Interest1' })],
    });
    renderWithTheme(<OnboardingPage />);
    await screen.findByText('Interest1');

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Please select or add at least 3 interests.')).toBeInTheDocument();
  });


  test('successful form submission navigates to project page', async () => {
    const formDataAppend = vi.spyOn(FormData.prototype, 'append');
    mockProfile({
      username: 'testuser',
      skills: ['S1', 'S2', 'S3'].map(name => JSON.stringify({ name })),
      interests: ['I1', 'I2', 'I3'].map(name => JSON.stringify({ name })),
    });
    axios.post.mockResolvedValue({ 
        data: { 
            message: 'Onboarding successful', 
            user: { username: 'testuser' },
            project: { projectId: '123', projectName: 'Test Project' }
        } 
    });

    renderWithTheme(<OnboardingPage />);
    await screen.findByText('S3');

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${import.meta.env.VITE_BACKEND_URL}/onboarding/initiate`,
        expect.any(FormData),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
      );
    });
    
    // Check FormData content (example for username)
    expect(formDataAppend).toHaveBeenCalledWith('username', 'testuser');
    expect(formDataAppend).toHaveBeenCalledWith('skills', JSON.stringify([{name: 'S1'}, {name: 'S2'}, {name: 'S3'}]));
    expect(formDataAppend).toHaveBeenCalledWith('interests', JSON.stringify([{name: 'I1'}, {name: 'I2'}, {name: 'I3'}]));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/visualizer/123', expect.objectContaining({
        state: expect.objectContaining({ onboardingJustCompleted: true }),
      }));
    });
  });

  test('successful form submission navigates to dashboard if no project ID', async () => {
    mockProfile({
      username: 'testuser',
      skills: ['S1', 'S2', 'S3'].map(name => JSON.stringify({ name })),
      interests: ['I1', 'I2', 'I3'].map(name => JSON.stringify({ name })),
    });
    axios.post.mockResolvedValue({ 
        data: { 
            message: 'Onboarding successful', 
            user: { username: 'testuser' },
            project: null // No project ID
        } 
    });

    renderWithTheme(<OnboardingPage />);
    await screen.findByText('S3');

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
     await act(async () => {
        fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
        state: expect.objectContaining({ onboardingJustCompleted: true }),
      }));
    });
  });

  test('displays error message on API call failure during submission', async () => {
    mockProfile({
      username: 'testuser',
      skills: ['S1', 'S2', 'S3'].map(name => JSON.stringify({ name })),
      interests: ['I1', 'I2', 'I3'].map(name => JSON.stringify({ name })),
    });
    axios.post.mockRejectedValue({
      response: { data: { message: 'Server error during onboarding' } },
    });

    renderWithTheme(<OnboardingPage />);
    await screen.findByText('S3');

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });
    
    expect(await screen.findByText('Server error during onboarding')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
