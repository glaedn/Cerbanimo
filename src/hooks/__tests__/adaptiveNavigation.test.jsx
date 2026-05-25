import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdaptiveNavigation } from '../useAdaptiveNavigation';

describe('useAdaptiveNavigation', () => {
  it('should NOT filter Signals mode for new users (deactivation test)', () => {
    const mockProfile = {
      roleProfile: { primaryRole: 'Explorer' },
      unlocked_systems: []
    };

    const { result } = renderHook(() => useAdaptiveNavigation(mockProfile));

    const signalsMode = result.current.visibleModes.find(m => m.label === 'Signals');
    expect(signalsMode).toBeDefined();
    expect(signalsMode.label).toBe('Signals');
  });

  it('should show Signals mode for contributors', () => {
    const mockProfile = {
      roleProfile: { primaryRole: 'Contributor' },
      unlocked_systems: ['Signals']
    };

    const { result } = renderHook(() => useAdaptiveNavigation(mockProfile));

    const signalsMode = result.current.visibleModes.find(m => m.label === 'Signals');
    expect(signalsMode).toBeDefined();
  });
});
