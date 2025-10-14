import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RealmHub from './RealmHub';
import { Auth0Provider } from '@auth0/auth0-react';

// Mock the necessary hooks and components
jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { sub: 'test-user', email: 'test@example.com', name: 'Test User' },
    getAccessTokenSilently: jest.fn().mockResolvedValue('test-token'),
  }),
}));

jest.mock('axios');

describe('RealmHub Component', () => {
  test('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/realm/1']}>
        <Routes>
          <Route path="/realm/:realmId" element={<RealmHub />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/loading realm data/i)).toBeInTheDocument();
  });
});