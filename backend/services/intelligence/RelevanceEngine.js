class RelevanceEngine {
  async filter(userId, signals, context) {
    const ranked = this.rankSignals(signals, context);
    return this.filterNoise(ranked);
  }

  rankSignals(signals, context) {
    return signals
      .map(signal => ({
        ...signal,
        relevanceScore: this.calculateScore(signal, context)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  calculateScore(signal, context) {
    let score = 0;

    // Base score by priority
    const priorityMap = { critical: 500, high: 100, medium: 50, low: 10 };
    score += priorityMap[signal.priority] || 0;

    // Boost if related to user's skills
    if (signal.requiredSkills && context.personal.skills) {
      const matchingSkills = signal.requiredSkills.filter(s =>
        context.personal.skills.includes(s)
      );
      score += matchingSkills.length * 20;
    }

    // Boost if urgent (crisis)
    if (signal.type === 'crisis') {
      score += 200;
    }

    // Penalize if user is already overloaded
    if (context.emotionalStateEstimate === 'overloaded' && signal.priority !== 'high' && signal.priority !== 'critical') {
      score -= 30;
    }

    return score;
  }

  filterNoise(signals, threshold = 0) {
    return signals.filter(s => s.relevanceScore >= threshold);
  }
}

export default new RelevanceEngine();
