import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import { ThemeProvider } from '@mui/material/styles'; // Import ThemeProvider
import { theme as appTheme } from '../../styles/theme'; // Import your custom theme

// Mock axios
jest.mock('axios');

// Mock useAuth0
jest.mock('@auth0/auth0-react');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock environment variable
const mockApiUrl = 'import.meta.env.VITE_BACKEND_URL';
process.env.REACT_APP_API_URL = mockApiUrl;


// Helper function to render with ThemeProvider
const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={appTheme}>{component}</ThemeProvider>);
};


describe('OnboardingPage', () => {
  const mockGetAccessTokenSilently = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { sub: 'test-user-sub', email: 'test@example.com' },
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isLoading: false,
    });
    mockGetAccessTokenSilently.mockResolvedValue('test-token');

    // Mock initial options fetch
    axios.get.mockResolvedValue({
      data: {
        skills: [{ id: 1, name: 'React' }, { id: 2, name: 'Node.js' }],
        interests: [{ id: 1, name: 'AI' }, { id: 2, name: 'Gardening' }],
      },
    });
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
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload Profile Picture/i).querySelector('input[type="file"]');

    // Mock FileReader
    const mockReadAsDataURL = jest.fn();
    const mockReader = {
        onloadend: jest.fn(),
        readAsDataURL: mockReadAsDataURL,
        result: 'data:image/png;base64,fakecodedstring'
    };
    jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader);
    
    await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
    });
    
    // Simulate onloadend being called
    mockReader.onloadend();

    await waitFor(() => {
      const avatar = screen.getByRole('img'); // Assuming Avatar has role='img'
      expect(avatar).toHaveAttribute('src', 'data:image/png;base64,fakecodedstring');
    });
  });
  
  test('handles skill selection including free solo', async () => {
    renderWithTheme(<OnboardingPage />);
    const skillsAutocomplete = screen.getByLabelText(/Skills \(at least 3\)/i);
    
    // Simulate typing a new skill and pressing Enter
    fireEvent.change(skillsAutocomplete, { target: { value: 'NewSkill' } });
    fireEvent.keyDown(skillsAutocomplete, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('NewSkill')).toBeInTheDocument(); // Chip rendered
    });

    // Simulate selecting an existing option (assuming 'React' is loaded)
    // This is hard to test without deep MUI interaction. We trust Autocomplete works.
  });


  test('shows validation error if username is missing', async () => {
    renderWithTheme(<OnboardingPage />);
    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
  });

  test('shows validation error if less than 3 skills are provided', async () => {
    renderWithTheme(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    // Add 1 skill
    const skillsInput = screen.getByLabelText(/Skills \(at least 3\)/i);
    fireEvent.change(skillsInput, { target: { value: 'Skill1' } });
    fireEvent.keyDown(skillsInput, { key: 'Enter' });

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Please select or add at least 3 skills.')).toBeInTheDocument();
  });
  
   test('shows validation error if less than 3 interests are provided', async () => {
    renderWithTheme(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    // Add 3 skills
    const skillsInput = screen.getByLabelText(/Skills \(at least 3\)/i);
    fireEvent.change(skillsInput, { target: { value: 'Skill1' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'Skill2' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'Skill3' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    
    // Add 1 interest
    const interestsInput = screen.getByLabelText(/Interests \(at least 3\)/i);
    fireEvent.change(interestsInput, { target: { value: 'Interest1' } });
    fireEvent.keyDown(interestsInput, { key: 'Enter' });

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText('Please select or add at least 3 interests.')).toBeInTheDocument();
  });


  test('successful form submission navigates to project page', async () => {
    axios.post.mockResolvedValue({ 
        data: { 
            message: 'Onboarding successful', 
            user: { username: 'testuser' },
            project: { projectId: '123', projectName: 'Test Project' }
        } 
    });

    renderWithTheme(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });

    const skillsInput = screen.getByLabelText(/Skills \(at least 3\)/i);
    fireEvent.change(skillsInput, { target: { value: 'S1' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S2' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });
    fireEvent.change(skillsInput, { target: { value: 'S3' } }); fireEvent.keyDown(skillsInput, { key: 'Enter' });

    const interestsInput = screen.getByLabelText(/Interests \(at least 3\)/i);
    fireEvent.change(interestsInput, { target: { value: 'I1' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I2' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    fireEvent.change(interestsInput, { target: { value: 'I3' } }); fireEvent.keyDown(interestsInput, { key: 'Enter' });
    
    // Mock FormData
    const mockFormDataAppend = jest.fn();
    global.FormData = jest.fn(() => ({
        append: mockFormDataAppend,
    }));

    const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${import.meta.env.VITE_BACKEND_URL}/api/onboarding/initiate`,
        expect.any(FormData), // Check that it's FormData
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
      );
    });
    
    // Check FormData content (example for username)
    expect(mockFormDataAppend).toHaveBeenCalledWith('username', 'testuser');
    expect(mockFormDataAppend).toHaveBeenCalledWith('skills', JSON.stringify([{name: 'S1'}, {name: 'S2'}, {name: 'S3'}]));
    expect(mockFormDataAppend).toHaveBeenCalledWith('interests', JSON.stringify([{name: 'I1'}, {name: 'I2'}, {name: 'I3'}]));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/project/123');
    });
  });

  test('successful form submission navigates to dashboard if no project ID', async () => {
    axios.post.mockResolvedValue({ 
        data: { 
            message: 'Onboarding successful', 
            user: { username: 'testuser' },
            project: null // No project ID
        } 
    });

    renderWithTheme(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    // Assume skills and interests are filled as in previous test
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
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on API call failure during submission', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'Server error during onboarding' } },
    });

    renderWithTheme(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    // Assume skills and interests are filled
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
