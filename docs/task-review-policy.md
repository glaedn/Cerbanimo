# Task Review Policy

`TaskReviewPolicyService` snapshots the policy into each review round.

Default policy:

```json
{
  "policyVersion": "task-review-v1",
  "peerApprovalsRequired": 3,
  "peerAssignmentTarget": 5,
  "peerDeadlineMinutes": 360,
  "pmDeadlineMinutes": 1080,
  "allowPeerTimeoutAdvance": true,
  "allowPmTimeoutAdvance": true,
  "minimumManualPeerApprovals": 0,
  "autoAdvanceRiskTiers": ["standard"],
  "highRiskRequiresHumanPeers": true,
  "highRiskRequiresHumanPm": true
}
```

Risk tiers are deterministic:

- `standard`: default task risk.
- `sensitive`: private interviews, attestations, location-sensitive evidence, community member data, or consent-limited media.
- `high_stakes`: legal, medical, financial, governance, safety-critical, public communication, conflict mediation, identity-sensitive, or explicitly high-risk work.

Sensitive and high-stakes work restricts timeout advancement and requires human review according to policy.
