import { describe, it, expect } from 'vitest';
import { useAdaptiveNavigation } from '../useAdaptiveNavigation';
import { renderHook } from '@testing-library/react';

describe('useAdaptiveNavigation', () => {
  it('should filter Signals mode for new users', () => {
    const mockProfile = {
      roleProfile: { primaryRole: 'Explorer', onboardingStage: 'orientation' },
      unlockedSystems: { advancedGovernance: false }
    };
    const { result } = renderHook(() => useAdaptiveNavigation(mockProfile));

    const signalsMode = result.current.visibleModes.find(m => m.label === 'Signals');
    expect(signalsMode).toBeUndefined();
  });

  it('should show Signals mode for contributors', () => {
    const mockProfile = {
      roleProfile: { primaryRole: 'Contributor', onboardingStage: 'participation' },
      unlockedSystems: { advancedGovernance: true }
    };
    const { result } = renderHook(() => useAdaptiveNavigation(mockProfile));

    const signalsMode = result.current.visibleModes.find(m => m.label === 'Signals');
    expect(signalsMode).toBeDefined();
  });
});
