class GuidanceEngine {
  async getPrompts(userId, context) {
    const prompts = [];

    // Role-based prompts (Navigator, Coordinator, Archivist, Sentinel, Mentor)
    const role = context.personal.role || 'Explorer';

    if (role === 'Contributor') {
      prompts.push({
        type: 'guidance',
        priority: 'low',
        persona: 'Navigator',
        message: "A nearby food distribution mission needs one more volunteer.",
        action: "/missions/nearby"
      });
    } else if (role === 'Coordinator') {
      prompts.push({
        type: 'guidance',
        priority: 'high',
        persona: 'Coordinator',
        message: "Three tasks are stalled waiting for approvals.",
        action: "/missions/managed"
      });
    }

    if (context.personal.onboarding_stage < 3) {
      prompts.push({
        type: 'guidance',
        priority: 'medium',
        persona: 'Mentor',
        message: "Consider joining a local community to unlock more coordination tools.",
        action: "/commons"
      });
    }

    return prompts;
  }
}

export default new GuidanceEngine();
