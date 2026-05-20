class ParticipationGuideService {
  /**
   * Provides contextual guidance based on the user's role and state.
   * @param {object} profile
   * @param {object} systemState
   * @returns {string} Contextual advice
   */
  getGuidance(profile, systemState = {}) {
    if (!profile || !profile.roleProfile) return "Welcome to Cerbanimo. Start by exploring the Orbit hub.";

    const { roleProfile } = profile;
    const { onboardingStage, primaryRole } = roleProfile;

    if (onboardingStage === 'orientation') {
      return "I found three beginner-friendly missions nearby to help you get started.";
    }

    if (primaryRole === 'Coordinator') {
      if (systemState.blockedMissions > 0) {
        return `Attention: ${systemState.blockedMissions} missions are currently blocked by missing resources.`;
      }
      return "Team momentum is steady. Consider reviewing pending impact reports.";
    }

    if (primaryRole === 'Contributor') {
      return "Your skills match two new urgent needs in the Commons.";
    }

    return "The constellation is evolving. How would you like to participate today?";
  }
}

export default new ParticipationGuideService();
