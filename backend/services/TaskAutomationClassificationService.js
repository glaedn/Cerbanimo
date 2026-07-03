export const AUTOMATION_CLASSIFICATIONS = ['human_driven', 'assisted_automation', 'fully_automatable'];
export const CLASSIFICATION_SOURCES = ['generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override'];
export const CLASSIFICATION_VERSION = 'task-automation-v1';

const allowedInputTypes = new Set([
  'text',
  'long_text',
  'number',
  'boolean',
  'date',
  'url',
  'repository',
  'file',
  'choice',
  'secret_reference',
  'approval'
]);

const allowedNetworkAccess = new Set(['none', 'restricted', 'required']);

const aliases = {
  human: 'human_driven',
  human_task: 'human_driven',
  human_driven: 'human_driven',
  manual: 'human_driven',
  assisted: 'assisted_automation',
  ai_assisted: 'assisted_automation',
  automation_assisted: 'assisted_automation',
  assisted_automation: 'assisted_automation',
  automatic: 'fully_automatable',
  automatable: 'fully_automatable',
  automation_ready: 'fully_automatable',
  fully_automatable: 'fully_automatable'
};

const humanRiskPatterns = [
  { code: 'LOCAL_PHYSICAL_WORK_REQUIRES_HUMAN', pattern: /\b(local|physical|in person|in-person|onsite|on site|deliver|delivery|transport|drive|pickup|pick up|repair|install|construction|physical build)\b/i },
  { code: 'INTERPERSONAL_CARE_REQUIRES_HUMAN', pattern: /\b(care|support group|counsel|therapy|medical|health|safety-critical)\b/i },
  { code: 'GOVERNANCE_DECISION_REQUIRES_HUMAN', pattern: /\b(hold .*vote|facilitate .*vote|binding .*vote|governance meeting|binding decision|constitution decision|ratify|mediate|mediation|conflict)\b/i },
  { code: 'FINANCIAL_COMMITMENT_REQUIRES_HUMAN', pattern: /\b(payment|payments|money|funds|token transfer|financial commitment|purchase|budget approval)\b/i },
  { code: 'UNSPECIFIED_ACCOUNT_ACCESS_REQUIRES_HUMAN', pattern: /\b(account access|credentials|password|secret|production access|admin access)\b/i }
];

export function normalizeTaskAutomationClassification(task = {}, options = {}) {
  const findings = [];
  const rawAutomation = record(task.automation);
  const requested = normalizeCategory(
    task.automation_classification ??
    task.automationClassification ??
    rawAutomation.classification
  );
  let classification = requested || 'human_driven';

  const confidence = normalizeConfidence(task.automation_confidence ?? task.automationConfidence ?? rawAutomation.confidence, findings);
  const requiredHumanInputs = normalizeRequiredHumanInputs(
    task.required_human_inputs ?? task.requiredHumanInputs ?? rawAutomation.requiredHumanInputs,
    findings
  );
  let automationRequirements = normalizeAutomationRequirements(
    task.automation_requirements ?? task.automationRequirements ?? rawAutomation.requirements ?? rawAutomation.automationRequirements,
    findings
  );
  const validationRequirements = normalizeValidationRequirements(
    task.validation_requirements ?? task.validationRequirements ?? rawAutomation.validationRequirements,
    findings
  );
  const source = normalizeSource(task.classification_source ?? task.classificationSource ?? rawAutomation.source, options.source);
  const originalSource = source;
  let normalizedSource = source;
  const text = `${task.name || ''} ${task.description || ''} ${task.skill_name || task.skillName || ''}`.toLowerCase();

  if (!requested) {
    findings.push(finding('UNKNOWN_CLASSIFICATION_FALLBACK', 'automation_classification', 'Unknown or missing classification defaults to human-driven.'));
    classification = 'human_driven';
    normalizedSource = source === 'generated' ? 'policy_downgrade' : source;
  }

  if (task.is_local === true) {
    findings.push(finding('LOCAL_PHYSICAL_WORK_REQUIRES_HUMAN', 'is_local', 'Local or physical work cannot be marked fully automatable.'));
    classification = 'human_driven';
    normalizedSource = 'policy_downgrade';
  }

  for (const rule of humanRiskPatterns) {
    if (rule.pattern.test(text)) {
      findings.push(finding(rule.code, 'description', 'This task requires human judgment, presence, approval, or accountable decision-making.'));
      classification = 'human_driven';
      normalizedSource = 'policy_downgrade';
      break;
    }
  }

  const communicationFinding = externalCommunicationFinding({
    text,
    classification,
    requiredHumanInputs,
    automationRequirements
  });
  if (communicationFinding) {
    findings.push(communicationFinding);
    classification = 'human_driven';
    normalizedSource = 'policy_downgrade';
  }

  if (classification === 'fully_automatable' && requiredHumanInputs.length > 0) {
    findings.push(finding('FULLY_AUTOMATABLE_WITH_INPUTS_DOWNGRADED', 'required_human_inputs', 'Tasks with required human inputs are automation-assisted, not fully automatable.'));
    classification = 'assisted_automation';
    normalizedSource = 'policy_downgrade';
  }

  if (classification === 'fully_automatable') {
    const capabilities = arrayOfStrings(automationRequirements.capabilities);
    const expectedArtifacts = arrayOfStrings(automationRequirements.expectedArtifacts);
    if (capabilities.length === 0 || expectedArtifacts.length === 0) {
      findings.push(finding('FULLY_AUTOMATABLE_REQUIRES_CAPABILITY_AND_ARTIFACT', 'automation_requirements', 'Fully automatable tasks require a bounded capability and expected artifact.'));
      classification = 'human_driven';
      normalizedSource = 'policy_downgrade';
    }
  }

  if (classification === 'assisted_automation' && requiredHumanInputs.length === 0) {
    findings.push(finding('ASSISTED_REQUIRES_HUMAN_INPUTS', 'required_human_inputs', 'Automation-assisted tasks require at least one explicit human input.'));
    classification = 'human_driven';
    normalizedSource = 'policy_downgrade';
  }

  if (classification === 'human_driven') {
    automationRequirements = stripMisleadingExecutionClaims(automationRequirements);
  }

  return {
    classification,
    confidence,
    rationale: normalizeRationale(
      task.automation_rationale ??
      task.automationRationale ??
      rawAutomation.rationale,
      classification
    ),
    requiredHumanInputs: classification === 'human_driven' ? [] : requiredHumanInputs,
    automationRequirements,
    validationRequirements,
    source: normalizedSource || originalSource || 'legacy_default',
    version: CLASSIFICATION_VERSION,
    findings
  };
}

export function serializeTaskAutomation(task = {}) {
  const classification = normalizeCategory(task.automation_classification) || 'human_driven';
  return {
    classification,
    confidenceBand: confidenceBand(task.automation_confidence),
    rationale: task.automation_rationale || defaultRationale(classification),
    requiredHumanInputs: Array.isArray(task.required_human_inputs) ? task.required_human_inputs : [],
    requirements: record(task.automation_requirements),
    validationRequirements: Array.isArray(task.validation_requirements) ? task.validation_requirements : [],
    source: normalizeSource(task.classification_source) || 'legacy_default',
    version: task.classification_version || CLASSIFICATION_VERSION,
    classifiedAt: task.classified_at || null,
    findings: Array.isArray(task.automation_policy_findings) ? task.automation_policy_findings : []
  };
}

export function classificationDbFields(result) {
  return {
    automation_classification: result.classification,
    automation_confidence: result.confidence,
    automation_rationale: result.rationale,
    required_human_inputs: result.requiredHumanInputs,
    automation_requirements: result.automationRequirements,
    validation_requirements: result.validationRequirements,
    classification_source: result.source,
    classification_version: result.version,
    automation_policy_findings: result.findings
  };
}

function normalizeCategory(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return aliases[key] || null;
}

function normalizeSource(value, fallback) {
  const source = String(value || fallback || 'legacy_default').trim().toLowerCase();
  return CLASSIFICATION_SOURCES.includes(source) ? source : 'legacy_default';
}

function normalizeConfidence(value, findings) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    findings.push(finding('CONFIDENCE_INVALID', 'automation_confidence', 'Automation confidence was not numeric.'));
    return null;
  }
  if (parsed < 0 || parsed > 1) {
    findings.push(finding('CONFIDENCE_CLAMPED', 'automation_confidence', 'Automation confidence was clamped into the 0 to 1 range.'));
  }
  return Math.max(0, Math.min(1, parsed));
}

function normalizeRequiredHumanInputs(value, findings) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const input = record(item);
    const key = safeKey(input.key || input.name || input.label);
    const inputType = allowedInputTypes.has(String(input.inputType || input.type)) ? String(input.inputType || input.type) : 'text';
    if (!key) {
      findings.push(finding('REQUIRED_INPUT_INVALID', `required_human_inputs[${index}]`, 'Required human input is missing a key.'));
      return null;
    }
    return {
      key,
      label: limitText(input.label || humanize(key), 80),
      description: limitText(input.description || '', 240),
      inputType,
      required: input.required !== false,
      sensitive: Boolean(input.sensitive),
      ...(inputType === 'choice' && Array.isArray(input.options) ? { options: normalizeOptions(input.options) } : {})
    };
  }).filter(Boolean);
}

function normalizeAutomationRequirements(value, findings) {
  const input = record(value);
  const networkAccess = allowedNetworkAccess.has(String(input.networkAccess)) ? String(input.networkAccess) : 'none';
  if (input.networkAccess && !allowedNetworkAccess.has(String(input.networkAccess))) {
    findings.push(finding('NETWORK_ACCESS_INVALID', 'automation_requirements.networkAccess', 'Unknown network access was normalized to none.'));
  }
  return {
    capabilities: arrayOfStrings(input.capabilities),
    tools: arrayOfStrings(input.tools),
    externalServices: arrayOfStrings(input.externalServices),
    permissions: arrayOfStrings(input.permissions),
    expectedArtifacts: arrayOfStrings(input.expectedArtifacts),
    estimatedDurationMinutes: positiveNumber(input.estimatedDurationMinutes),
    networkAccess
  };
}

function normalizeValidationRequirements(value, findings) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const requirement = record(item);
    const requirementId = safeKey(requirement.requirementId || requirement.id || requirement.key);
    if (!requirementId) {
      findings.push(finding('VALIDATION_REQUIREMENT_INVALID', `validation_requirements[${index}]`, 'Validation requirement is missing an id.'));
      return null;
    }
    return {
      requirementId,
      description: limitText(requirement.description || '', 240),
      proofTypes: arrayOfStrings(requirement.proofTypes),
      checks: arrayOfStrings(requirement.checks)
    };
  }).filter(Boolean);
}

function stripMisleadingExecutionClaims(requirements) {
  return {
    ...requirements,
    capabilities: [],
    permissions: [],
    expectedArtifacts: []
  };
}

function externalCommunicationFinding({ text, classification, requiredHumanInputs, automationRequirements }) {
  const publicationIntent = /\b(publish|post publicly|send outreach|send .*email|email campaign|public announcement)\b/i.test(text);
  if (!publicationIntent) return null;

  const hasApproval = requiredHumanInputs.some((input) => input.inputType === 'approval');
  const hasAudienceOrTarget = requiredHumanInputs.some((input) => /audience|target|channel|recipient/.test(input.key));
  const hasContentContext = requiredHumanInputs.some((input) => /content|source|message|draft|context/.test(input.key));
  const capabilities = arrayOfStrings(automationRequirements.capabilities);
  const preparationOnly = capabilities.some((capability) => /(draft|prepare|review)/i.test(capability));
  const immediateExternalEffect = capabilities.some((capability) => /(publish|send|post)/i.test(capability));

  if (classification === 'assisted_automation' && hasApproval && hasAudienceOrTarget && hasContentContext && preparationOnly && !immediateExternalEffect) {
    return null;
  }

  return finding('EXTERNAL_PUBLICATION_REQUIRES_APPROVAL', 'description', 'External communication requires an approval boundary and cannot be treated as immediately executable.');
}

function normalizeRationale(value, classification) {
  const text = limitText(value, 240);
  return text || defaultRationale(classification);
}

function defaultRationale(classification) {
  if (classification === 'assisted_automation') return 'Kamiya can help after required inputs and permissions are supplied.';
  if (classification === 'fully_automatable') return 'The task describes bounded digital work with explicit capability and artifact requirements.';
  return 'This work needs a person\'s judgment, participation, or physical action.';
}

function confidenceBand(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 0.8) return 'high';
  if (parsed >= 0.5) return 'medium';
  return 'low';
}

function finding(code, field, message) {
  return { code, field, message };
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => limitText(item, 120)).filter(Boolean) : [];
}

function normalizeOptions(value) {
  return value.map((item) => {
    const option = record(item);
    const optionValue = limitText(option.value, 80);
    if (!optionValue) return null;
    return { value: optionValue, label: limitText(option.label || optionValue, 80) };
  }).filter(Boolean);
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function limitText(value, maxLength = 240) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function safeKey(value) {
  return limitText(value, 80).toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
}

function humanize(value) {
  return String(value || '').replace(/[_:-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
