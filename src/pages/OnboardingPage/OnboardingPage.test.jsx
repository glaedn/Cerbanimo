import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, MemoryRouter } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import { ThemeProvider } from '@mui/material/styles';
import muiTheme from '../../styles/muiTheme';

// Mock axios
vi.mock('axios');

// Mock useAuth0
vi.mock('@auth0/auth0-react');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock the env utility
const MOCK_BACKEND_URL = 'http://mock-backend.test';
vi.mock('../../utils/env', () => ({
    VITE_BACKEND_URL: MOCK_BACKEND_URL,
}));


// Helper function to render with ThemeProvider and MemoryRouter
const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={muiTheme}>
        <MemoryRouter>
            {component}
        </MemoryRouter>
    </ThemeProvider>
  );
};

describe('OnboardingPage', () => {
  const mockGetAccessTokenSilently = vi.fn();

  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_URL', MOCK_BACKEND_URL);
    vi.clearAllMocks();
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { sub: 'test-user-sub', email: 'test@example.com' },
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isLoading: false,
    });
    mockGetAccessTokenSilently.mockResolvedValue('test-token');

    axios.get.mockResolvedValue({
      data: {
        skillsPool: [{ id: 1, name: 'React' }, { id: 2, name: 'Node.js' }],
        interestsPool: [{ id: 1, name: 'AI' }, { id: 2, name: 'Gardening' }],
      },
    });
  });

  test('renders all form fields correctly', async () => {
    renderWithProviders(<OnboardingPage />);
    expect(screen.getByText(/Welcome! Let's set up your profile./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Profile Picture/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skills \(at least 3\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interests \(at least 3\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Profile/i })).toBeInTheDocument();
  });

  test('updates username state on input', () => {
    renderWithProviders(<OnboardingPage />);
    const usernameInput = screen.getByLabelText(/Username/i);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(usernameInput.value).toBe('testuser');
  });

  test('handles profile picture selection and shows preview', async () => {
    renderWithProviders(<OnboardingPage />);
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const input = screen.getByTestId('profile-picture-input');


    const mockReadAsDataURL = vi.fn();
    const mockReader = {
        onloadend: vi.fn(),
        readAsDataURL: mockReadAsDataURL,
        result: 'data:image/png;base64,fakecodedstring'
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockReader);
    
    await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
    });
    
    mockReader.onloadend();

    await waitFor(() => {
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'data:image/png;base64,fakecodedstring');
    });
  });
  
  test('shows validation error if username is missing', async () => {
    renderWithProviders(<OnboardingPage />);
    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
  });

  test('successful form submission navigates to orbit page', async () => {
    axios.post.mockResolvedValue({
        data: {
            message: 'Onboarding successful',
            user: { username: 'testuser' },
            intention: { intentionId: '123' }
        }
    });

    renderWithProviders(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });

    const skillsInput = screen.getByLabelText(/Skills \(at least 3\)/i);
    fireEvent.change(skillsInput, { target: { value: 'S1' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S2' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S3' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });

    const interestsInput = screen.getByLabelText(/Interests \(at least 3\)/i);
    fireEvent.change(interestsInput, { target: { value: 'I1' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I2' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I3' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    
    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${MOCK_BACKEND_URL}/api/onboarding/initiate`,
        expect.any(Object), // Changed from FormData to Object as it's a FormData instance
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    });

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/visualizer/123', {
            state: {
                onboardingJustCompleted: true,
                updatedUserFromOnboarding: { username: 'testuser' }
            }
        });
    });
  });

  test('displays error message on API call failure during submission', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'Server error during onboarding' } },
    });

    renderWithProviders(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    const skillsInput = screen.getByLabelText(/Skills \(at least 3\)/i);
    fireEvent.change(skillsInput, { target: { value: 'S1' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S2' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S3' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    const interestsInput = screen.getByLabelText(/Interests \(at least 3\)/i);
    fireEvent.change(interestsInput, { target: { value: 'I1' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I2' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I3' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });
    
    expect(await screen.findByText('Server error during onboarding')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});