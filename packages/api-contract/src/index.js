import { createHash } from 'node:crypto';

export const CONTRACT_VERSION = '1.0.0';

const identifier = { anyOf: [{ type: 'integer' }, { type: 'string' }] };
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };

export const apiContractSchemas = Object.freeze({
  CanonicalTask: {
    type: 'object',
    required: ['id', 'projectId', 'title', 'status', 'dependencies', 'allowedActions'],
    properties: {
      id: identifier,
      projectId: identifier,
      title: { type: 'string' },
      objective: { type: 'string' },
      status: { type: 'string' },
      dependencies: { type: 'array', items: identifier },
      rewardPreview: { type: 'object', properties: { amount: { type: 'number' }, tokenType: { type: 'string' } } },
      automation: { $ref: '#/components/schemas/TaskAutomation' },
      allowedActions: { type: 'object', additionalProperties: { type: 'boolean' } }
    },
    additionalProperties: true
  },
  TaskAutomation: {
    type: 'object',
    required: ['classification'],
    properties: {
      classification: { enum: ['human_driven', 'assisted_automation', 'fully_automatable'] },
      confidenceBand: { anyOf: [{ enum: ['low', 'medium', 'high'] }, { type: 'null' }] },
      rationale: { type: 'string' },
      requiredHumanInputs: { type: 'array' },
      requirements: { type: 'object' },
      validationRequirements: { type: 'array' },
      source: { enum: ['generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override'] },
      version: nullableString,
      classifiedAt: nullableString,
      findings: { type: 'array' }
    },
    additionalProperties: true
  },
  EvidenceItem: {
    type: 'object',
    required: ['id', 'evidence_type'],
    properties: {
      id: identifier,
      evidence_uuid: { type: 'string', format: 'uuid' },
      evidence_type: { type: 'string' },
      requirement_ids: { type: 'array', items: { type: 'string' } },
      title: nullableString,
      text_content: nullableString,
      source_url: nullableString,
      artifact_uri: nullableString
    },
    additionalProperties: true
  },
  EvidenceBundle: {
    type: 'object',
    required: ['id', 'task_id', 'status', 'version'],
    properties: {
      id: identifier,
      bundle_uuid: { type: 'string', format: 'uuid' },
      task_id: identifier,
      status: { type: 'string' },
      version: { type: 'integer' },
      reflection: nullableString,
      summary: nullableString,
      encounter_context: {
        type: 'object',
        properties: {
          visibility: { enum: ['private', 'split_party', 'shared_party'] },
          participantUserIds: { type: 'array', items: identifier },
          npcMode: { enum: ['off', 'optional'] },
          rewardPolicy: { type: 'object' }
        }
      },
      items: { type: 'array', items: { $ref: '#/components/schemas/EvidenceItem' } }
    },
    additionalProperties: true
  },
  ValidationResult: {
    type: 'object',
    required: ['id', 'task_id', 'bundle_id', 'status', 'overall_verdict'],
    properties: {
      id: identifier,
      task_id: identifier,
      bundle_id: identifier,
      status: { type: 'string' },
      overall_verdict: { type: 'string' },
      summary: nullableString,
      requirement_results: { type: 'array' },
      findings: { type: 'array' }
    },
    additionalProperties: true
  },
  ReviewRound: {
    type: 'object',
    required: ['id', 'task_id', 'status', 'stage'],
    properties: {
      id: identifier,
      round_uuid: { type: 'string', format: 'uuid' },
      task_id: identifier,
      status: { type: 'string' },
      stage: { type: 'string' },
      peer_approvals_required: { type: 'integer' },
      peer_approvals_received: { type: 'integer' },
      settlement_status: nullableString
    },
    additionalProperties: true
  },
  AcceptanceSettlement: {
    type: 'object',
    required: ['status'],
    properties: {
      settlementId: { type: 'string' },
      settlementRecordId: identifier,
      status: { enum: ['pending', 'queued', 'running', 'retry_wait', 'completed', 'blocked', 'failed', 'cancelled'] },
      attemptCount: { type: 'integer' },
      policyVersion: { type: 'string' },
      task: { type: 'object' },
      project: { type: 'object' },
      rewards: { type: 'object' },
      skillChanges: { type: 'array' },
      activatedTasks: { type: 'array' },
      storyEvent: { type: 'object' },
      completionRecord: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      lastError: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      allowedActions: { type: 'object', additionalProperties: { type: 'boolean' } }
    },
    additionalProperties: true
  },
  DomainEventEnvelope: {
    type: 'object',
    required: ['sequence', 'id', 'eventType', 'aggregateType', 'aggregateId', 'payload', 'timestamp'],
    properties: {
      sequence: { type: 'integer' },
      id: { type: 'string', format: 'uuid' },
      eventType: { type: 'string' },
      aggregateType: { type: 'string' },
      aggregateId: { type: 'string' },
      projectId: identifier,
      communityId: identifier,
      payload: { type: 'object' },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },
  CommandActionPreview: {
    type: 'object',
    required: ['id', 'action_type', 'status', 'preview'],
    properties: {
      id: identifier,
      action_uuid: { type: 'string', format: 'uuid' },
      action_type: { type: 'string' },
      status: { type: 'string' },
      preview: { type: 'object' },
      risk_level: { type: 'string' },
      allowedActions: { type: 'object', additionalProperties: { type: 'boolean' } }
    },
    additionalProperties: true
  },
  KamiyaStructuredResponse: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
      narration: nullableString,
      factualRefs: { type: 'array' },
      cards: { type: 'array' },
      choices: { type: 'array' },
      withheldFacts: { type: 'array' }
    },
    additionalProperties: true
  }
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const CONTRACT_SCHEMA_DIGEST = `sha256:${createHash('sha256').update(canonicalJson(apiContractSchemas)).digest('hex')}`;
export const CONTRACT_IDENTITY = Object.freeze({ version: CONTRACT_VERSION, digest: CONTRACT_SCHEMA_DIGEST });
