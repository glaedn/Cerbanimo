class ParticipationGuideService {
  /**
   * Provides contextual guidance based on the intelligence pulse or role profile.
   * Now integrates with the Intelligence Layer's GuidanceEngine.
   */
  getGuidance(profile, pulse = null) {
    // If we have an intelligence pulse, prioritize its guidance signals
    if (pulse && pulse.signals) {
      const guidanceSignals = pulse.signals.filter(s => s.type === 'guidance');
      if (guidanceSignals.length > 0) {
        // Return the message from the highest priority guidance signal
        return guidanceSignals[0].message;
      }
    }

    // Fallback to legacy role-based logic if pulse is missing or silent
    if (!profile || !profile.roleProfile) return "Welcome to Cerbanimo. Start by exploring the Orbit hub.";

    const { roleProfile } = profile;
    const { onboardingStage, primaryRole } = roleProfile;

    if (onboardingStage === 'orientation') {
      return "I found three beginner-friendly missions nearby to help you get started.";
    }

    if (primaryRole === 'Coordinator') {
      return "Team momentum is steady. Consider reviewing pending impact reports.";
    }

    if (primaryRole === 'Contributor') {
      return "Your skills match two new urgent needs in the Commons.";
    }

    return "The constellation is evolving. How would you like to participate today?";
  }
}

export default new ParticipationGuideService();
