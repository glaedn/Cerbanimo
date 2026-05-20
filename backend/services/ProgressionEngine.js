class ProgressionEngine {
  /**
   * Determines which systems are visible/unlocked for a user based on their profile.
   * @param {object} roleProfile
   * @returns {object} Unlocked systems map
   */
  getUnlockedSystems(roleProfile) {
    const { trustLevel, onboardingStage, primaryRole } = roleProfile;

    return {
      federation: trustLevel >= 4 || onboardingStage === 'governance',
      advancedGovernance: trustLevel >= 3 || primaryRole === 'Governance Participant',
      constellationAnalytics: trustLevel >= 2 || onboardingStage !== 'orientation',
      systemGraphs: trustLevel >= 3,
      civicSimulation: trustLevel >= 5,
      crisisManagement: trustLevel >= 3 || roleProfile.roleWeights.coordinator > 0.5,
      mentorshipTools: roleProfile.mentorshipStatus.is_mentor || trustLevel >= 4
    };
  }
}

export default new ProgressionEngine();
