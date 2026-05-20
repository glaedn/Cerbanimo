import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrbitPage from '../OrbitPage';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useAssignedTasks from '../../../hooks/useAssignedTasks';

vi.mock('../../../hooks/useUserProfile');
vi.mock('../../../hooks/useAssignedTasks');

describe('OrbitPage', () => {
  it('should render Explorer view for new users', () => {
    useUserProfile.mockReturnValue({
      profile: {
        roleProfile: { primaryRole: 'Explorer' },
        unlockedSystems: {}
      },
      loading: false
    });
    useAssignedTasks.mockReturnValue({ assignedTasks: [], loading: false });

    render(
      <MemoryRouter initialEntries={['/orbit']}>
        <OrbitPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Welcome to Cerbanimo')).toBeDefined();
    expect(screen.getByText('Orientation')).toBeDefined();
  });

  it('should render Contributor view for contributors', () => {
    useUserProfile.mockReturnValue({
      profile: {
        roleProfile: { primaryRole: 'Contributor' },
        unlockedSystems: {}
      },
      loading: false
    });
    useAssignedTasks.mockReturnValue({ assignedTasks: [], loading: false });

    render(
      <MemoryRouter initialEntries={['/orbit']}>
        <OrbitPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Ready for Mission')).toBeDefined();
    expect(screen.getByText('Find Work')).toBeDefined();
  });
});
