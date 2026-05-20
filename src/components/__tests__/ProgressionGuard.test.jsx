import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressionGuard } from '../ProgressionGuard';
import { useProgression } from '../../hooks/useProgression';

vi.mock('../../hooks/useProgression');

describe('ProgressionGuard', () => {
  it('should render children when system is unlocked', () => {
    useProgression.mockReturnValue({
      isUnlocked: () => true,
      loading: false
    });

    render(
      <ProgressionGuard system="advancedGovernance">
        <div data-testid="unlocked-content">Protected Content</div>
      </ProgressionGuard>
    );

    expect(screen.getByTestId('unlocked-content')).toBeDefined();
  });

  it('should render fallback when locked and no overlay', () => {
    useProgression.mockReturnValue({
      isUnlocked: () => false,
      loading: false
    });

    render(
      <ProgressionGuard system="advancedGovernance" fallback={<div data-testid="fallback">Locked</div>}>
        <div>Protected Content</div>
      </ProgressionGuard>
    );

    expect(screen.queryByTestId('unlocked-content')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeDefined();
  });

  it('should render overlay when locked and lockOverlay is true', () => {
    useProgression.mockReturnValue({
      isUnlocked: () => false,
      loading: false
    });

    const { container } = render(
      <ProgressionGuard system="advancedGovernance" lockOverlay={true}>
        <div>Protected Content</div>
      </ProgressionGuard>
    );

    expect(container.querySelector('.progression-locked-overlay')).toBeDefined();
    expect(screen.getByText('System Locked')).toBeDefined();
  });
});
