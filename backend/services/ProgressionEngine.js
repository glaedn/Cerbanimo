import IdentityGateService from './IdentityGateService.js';

class ProgressionEngine {
  /**
   * Determines which systems are visible/unlocked for a user based on their profile.
   * @param {object} roleProfile
   * @returns {object} Unlocked systems map
   */
  getUnlockedSystems(roleProfile, profile = {}) {
    const { trustLevel, onboardingStage, primaryRole } = roleProfile;
    const identityTier = IdentityGateService.calculateTier(profile);
    const tier = identityTier.tier;

    return {
      tier,
      identityTier,
      linkedAccount: tier >= 1,
      fullBrowsing: tier >= 1,
      tokenEarning: tier >= 1,
      basicTrust: tier >= 1,
      skillMatching: tier >= 2,
      locationAwareNeeds: tier >= 2,
      mapFeatures: tier >= 2,
      taskRecommendations: tier >= 2,
      recommendationEngine: tier >= 3,
      governanceParticipation: tier >= 3,
      highStakesVerification: tier >= 3,
      federation: tier >= 3 && (trustLevel >= 4 || onboardingStage === 'governance'),
      advancedGovernance: tier >= 3 && (trustLevel >= 3 || primaryRole === 'Governance Participant'),
      constellationAnalytics: tier >= 2 && (trustLevel >= 2 || onboardingStage !== 'orientation'),
      systemGraphs: tier >= 3 && trustLevel >= 3,
      civicSimulation: tier >= 3 && trustLevel >= 5,
      crisisManagement: tier >= 3 && (trustLevel >= 3 || roleProfile.roleWeights.coordinator > 0.5),
      mentorshipTools: tier >= 3 && (roleProfile.mentorshipStatus.is_mentor || trustLevel >= 4)
    };
  }
}

export default new ProgressionEngine();
