import pool from '../../db.js';

class FrictionDetectionEngine {
  async detectFriction(userId, context) {
    const frictions = [];

    // Detect stalled missions
    if (context.system.blockedMissions.length > 0) {
      frictions.push({
        type: 'friction',
        priority: 'high',
        category: 'mission',
        message: `${context.system.blockedMissions.length} of your missions are currently stalled.`,
        data: context.system.blockedMissions
      });
    }

    // Detect coordinator overload
    if (context.emotionalState === 'overloaded') {
      frictions.push({
        type: 'friction',
        priority: 'medium',
        category: 'coordination',
        message: 'High coordination load detected. Consider delegating tasks.',
      });
    }

    return frictions;
  }
}

export default new FrictionDetectionEngine();
