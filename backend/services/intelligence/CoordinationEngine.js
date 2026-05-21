import pool from '../../db.js';
import ContextEngine from './ContextEngine.js';
import RelevanceEngine from './RelevanceEngine.js';
import OpportunityEngine from './OpportunityEngine.js';
import FrictionDetectionEngine from './FrictionDetectionEngine.js';
import GuidanceEngine from './GuidanceEngine.js';
import CrisisCoordinationEngine from './CrisisCoordinationEngine.js';
import NarrativeInferenceEngine from './NarrativeInferenceEngine.js';
import TrustInferenceEngine from './TrustInferenceEngine.js';

class CoordinationEngine {
  async getPulse(userId) {
    // 1. Gather Context
    const context = await ContextEngine.getContext(userId);

    // 2. Parallel Processing by specialized engines
    const [
      opportunities,
      frictions,
      crises,
      narratives,
      guidance
    ] = await Promise.all([
      OpportunityEngine.getOpportunities(userId, context),
      FrictionDetectionEngine.detectFriction(userId, context),
      CrisisCoordinationEngine.getSignals(userId, context),
      NarrativeInferenceEngine.getNarratives(userId, context),
      GuidanceEngine.getPrompts(userId, context)
    ]);

    // 3. Aggregate all signals
    const rawSignals = [
      ...opportunities,
      ...frictions,
      ...crises,
      ...narratives,
      ...guidance
    ];

    // 4. Rank and Filter through Relevance Engine
    const relevantSignals = await RelevanceEngine.filter(userId, rawSignals, context);

    // 5. Update Trust/Reputation based on activity
    await TrustInferenceEngine.updateReputation(userId, context);

    return {
      userId,
      timestamp: new Date().toISOString(),
      context: {
        currentFocus: context.currentFocus,
        urgencyLevel: context.urgencyLevel,
        emotionalStateEstimate: context.emotionalState
      },
      signals: relevantSignals
    };
  }
}

export default new CoordinationEngine();
