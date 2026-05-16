/**
 * F3 Signal Weighting System
 * Calculates the priority score of an ecosystem event to reduce coordination entropy.
 * formula: signalScore = urgency + proximity + relevance + trustWeight + roleImportance + ecosystemImpact
 */
export const calculateSignalScore = (event, context = {}) => {
  const {
    userRole = 'volunteer',
    userRegion = null,
    activeMissions = []
  } = context;

  let score = 0;

  // 1. Base Urgency (0-40)
  score += (event.urgency || 0) * 4;
  if (event.type?.includes('crisis')) score += 30;
  if (event.status === 'blocked') score += 20;

  // 2. Proximity (0-20)
  if (userRegion && event.region === userRegion) {
    score += 20;
  } else if (context.latitude && context.longitude && event.location) {
    // Spatial Proximity weighting
    const dx = context.longitude - event.location.x;
    const dy = context.latitude - event.location.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 0.01) score += 20; // ~1km
    else if (distSq < 0.04) score += 10; // ~2km
  }

  // 3. Relevance to active missions/role (0-25)
  if (activeMissions.includes(event.projectId || event.missionId)) {
    score += 20;
  }
  if (event.requiredRole === userRole) {
    score += 15;
  }

  // 4. Ecosystem Impact (0-15)
  score += (event.impactScore || 0) * 1.5;

  // 5. Governance specific weighting
  if (event.type === 'governance.participation_collapse') score += 50;
  if (event.type === 'governance.authority_concentration') score += 45;
  if (event.type === 'governance.constitutional_drift') score += 40;
  if (event.type === 'governance.treaty_tension') score += 30;

  return Math.min(score, 100);
};

export const categorizeSignal = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'active';
  return 'ambient';
};
