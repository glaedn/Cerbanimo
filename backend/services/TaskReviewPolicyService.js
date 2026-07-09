const DEFAULT_POLICY = {
  policyVersion: 'task-review-v1',
  peerApprovalsRequired: 3,
  peerAssignmentTarget: 5,
  peerDeadlineMinutes: 360,
  pmDeadlineMinutes: 1080,
  allowPeerTimeoutAdvance: true,
  allowPmTimeoutAdvance: true,
  minimumManualPeerApprovals: 0,
  autoAdvanceRiskTiers: ['standard'],
  highRiskRequiresHumanPeers: true,
  highRiskRequiresHumanPm: true,
  allowCollaborativeCoassigneeReview: false,
  allowSelfSealSinglePersonProject: false
};

const highStakesPattern = /\b(legal|medical|diagnosis|financial movement|payment|transfer|binding governance|safety-critical|public publication|external communication|conflict mediation|identity|high[-_\s]?stakes)\b/i;
const sensitivePattern = /\b(private interview|interview|attestation|personal|location|gps|community member|consent|sensitive)\b/i;

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

class TaskReviewPolicyService {
  defaultPolicy(overrides = {}) {
    return {
      ...DEFAULT_POLICY,
      ...(overrides || {})
    };
  }

  riskTierFor({ task = {}, bundle = {}, validationResult = {}, findings = [] } = {}) {
    const haystack = [
      task.name,
      task.description,
      task.task_type,
      task.validation_requirements,
      task.automation_policy_findings,
      bundle.summary,
      bundle.reflection,
      validationResult.summary,
      validationResult.requirement_results,
      findings
    ].map(asText).join('\n');
    if (highStakesPattern.test(haystack)) return 'high_stakes';
    if (sensitivePattern.test(haystack)) return 'sensitive';
    return 'standard';
  }

  canPeerTimeoutAdvance(round) {
    const policy = round.policy_snapshot || round.policySnapshot || DEFAULT_POLICY;
    const riskTier = round.risk_tier || round.riskTier || 'standard';
    const approvals = Number(round.peer_approvals_received || 0);
    if (!policy.allowPeerTimeoutAdvance) return false;
    if (!policy.autoAdvanceRiskTiers?.includes(riskTier)) return false;
    if (riskTier === 'sensitive' && approvals < Number(policy.minimumManualPeerApprovals || 1)) return false;
    if (riskTier === 'high_stakes' && policy.highRiskRequiresHumanPeers) return false;
    return true;
  }

  canPmTimeoutAdvance(round) {
    const policy = round.policy_snapshot || round.policySnapshot || DEFAULT_POLICY;
    const riskTier = round.risk_tier || round.riskTier || 'standard';
    if (!policy.allowPmTimeoutAdvance) return false;
    if (!policy.autoAdvanceRiskTiers?.includes(riskTier)) return false;
    if (riskTier !== 'standard') return false;
    if (riskTier === 'high_stakes' && policy.highRiskRequiresHumanPm) return false;
    return true;
  }
}

export { DEFAULT_POLICY };
export default new TaskReviewPolicyService();
