import { useMemo } from 'react';
import { CORE_MODES } from '../utils/platformNavigation';

/**
 * Hook to determine visible routes and priority actions based on the enriched profile.
 * @param {object} profile
 * @returns {object} Navigation configuration
 */
export const useAdaptiveNavigation = (profile) => {
  return useMemo(() => {
    if (!profile || !profile.roleProfile) {
      return {
        visibleModes: CORE_MODES.filter(m => m.label !== 'Signals'),
        priorityActions: [],
        contextualPanels: []
      };
    }

    const { roleProfile, unlockedSystems } = profile;
    const { primaryRole, onboardingStage } = roleProfile;

    // Filter modes based on progression
    const visibleModes = CORE_MODES.filter(mode => {
      if (mode.label === 'Signals' && !unlockedSystems.advancedGovernance && onboardingStage === 'orientation') {
        return false;
      }
      return true;
    });

    // Determine priority actions based on role
    const priorityActions = [];
    if (primaryRole === 'Contributor') {
      priorityActions.push({ label: 'Execute Mission', path: '/missions', icon: '🚀' });
    } else if (primaryRole === 'Coordinator') {
      priorityActions.push({ label: 'Review Submissions', path: '/orbit/coordinator', icon: '📋' });
      priorityActions.push({ label: 'Check Team Pulse', path: '/signals', icon: '📡' });
    } else if (primaryRole === 'Steward' || primaryRole === 'Governance Participant') {
      priorityActions.push({ label: 'View Proposals', path: '/signals/governance', icon: '⚖️' });
    }

    return {
      visibleModes,
      priorityActions,
      contextualPanels: unlockedSystems.constellationAnalytics ? ['analytics'] : []
    };
  }, [profile]);
};
