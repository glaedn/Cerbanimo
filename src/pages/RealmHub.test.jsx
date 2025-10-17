import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RealmHub from './RealmHub';
import { Auth0Provider } from '@auth0/auth0-react';

// Mock the necessary hooks and components
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { sub: 'test-user', email: 'test@example.com', name: 'Test User' },
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
  }),
}));

vi.mock('axios');

import axios from 'axios';

describe('RealmHub Component', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/profile')) {
        return Promise.resolve({ data: { id: 1, name: 'Test User', vote_delegations: {} } });
      }
      if (url.endsWith('/realms/1')) {
        return Promise.resolve({ data: { name: 'Test Realm', members: [1], proposals: [], approved_intentions: [], vote_delegations: {} } });
      }
      if (url.endsWith('/realms/1/membership-requests')) {
        return Promise.resolve({ data: [] });
      }
      if (url.endsWith('/realms/1/scores')) {
        return Promise.resolve({ data: [{id: 1, realmScore: 100}] });
      }
      if (url.includes('/profile/public/1')) {
        return Promise.resolve({ data: { id: 1, username: 'Test User', profile_picture: '' } });
      }
      // A default to avoid unhandled rejections for unexpected calls
      return Promise.resolve({ data: {} });
    });
  });

  test('renders realm name after successful data fetching', async () => {
    render(
      <MemoryRouter initialEntries={['/realm/1']}>
        <Routes>
          <Route path="/realm/:realmId" element={<RealmHub />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Test Realm/i, {}, { timeout: 10000 })).toBeInTheDocument();
  });
});