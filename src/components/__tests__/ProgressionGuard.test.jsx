import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressionGuard } from '../ProgressionGuard';
import { useUserProfile } from '../../hooks/useUserProfile';

vi.mock('../../hooks/useUserProfile');

describe('ProgressionGuard', () => {
  it('should render children even when system would normally be locked (deactivation test)', () => {
    useUserProfile.mockReturnValue({
      profile: {
        unlocked_systems: []
      }
    });

    render(
      <ProgressionGuard system="Signals">
        <div data-testid="unlocked-content">Protected Content</div>
      </ProgressionGuard>
    );

    expect(screen.getByTestId('unlocked-content')).toBeDefined();
    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('should not render fallback when locked because limitations are deactivated', () => {
    useUserProfile.mockReturnValue({
      profile: {
        unlocked_systems: []
      }
    });

    render(
      <ProgressionGuard system="Signals" fallback={<div data-testid="fallback">Locked</div>}>
        <div data-testid="unlocked-content">Protected Content</div>
      </ProgressionGuard>
    );

    expect(screen.queryByTestId('unlocked-content')).toBeDefined();
    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('should not render overlay when locked because limitations are deactivated', () => {
    useUserProfile.mockReturnValue({
      profile: {
        unlocked_systems: []
      }
    });

    const { container } = render(
      <ProgressionGuard system="Signals" lockOverlay={true}>
        <div>Protected Content</div>
      </ProgressionGuard>
    );

    expect(container.querySelector('.progression-locked-overlay')).toBeNull();
    expect(screen.queryByText('System Locked')).toBeNull();
  });
});
