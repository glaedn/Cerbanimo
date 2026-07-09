import crypto from 'crypto';

const defaultEvidenceTypes = [
  'text',
  'url_snapshot',
  'image',
  'document',
  'artifact_reference',
  'repository_commit',
  'pull_request',
  'automation_report',
  'command_result',
  'attestation',
  'receipt'
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJsonish(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function compactText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function stableRequirementId(requirement, index) {
  const rawId = requirement.requirementId || requirement.requirement_id || requirement.id || requirement.key;
  if (rawId) return String(rawId).trim();
  const basis = compactText(`${requirement.description || ''} ${asArray(requirement.checks).join(',')}`) || `requirement-${index + 1}`;
  const hash = crypto.createHash('sha1').update(basis).digest('hex').slice(0, 8);
  return `req-${index + 1}-${hash}`;
}

function normalizeSemanticReview(value) {
  if (value === undefined || value === null || value === false || value === '') return 'never';
  if (value === true) return 'required';
  const normalized = String(value).trim().toLowerCase();
  if (['never', 'optional', 'required'].includes(normalized)) return normalized;
  return 'configuration_error';
}

class TaskEvidenceRequirementService {
  normalizeForTask(task = {}) {
    const raw = parseJsonish(task.validation_requirements ?? task.validationRequirements, []);
    const requirements = asArray(raw).length > 0
      ? asArray(raw)
      : [{
          requirementId: 'general-proof',
          description: 'Provide bounded evidence and a reflection showing the task was completed.',
          proofTypes: defaultEvidenceTypes,
          checks: ['evidence_present', 'reflection_present'],
          minimumEvidenceItems: 1
        }];

    const seen = new Set();
    return requirements.map((requirement, index) => {
      const id = stableRequirementId(requirement, index);
      if (seen.has(id)) {
        const error = new Error(`Duplicate validation requirement id: ${id}`);
        error.status = 422;
        error.code = 'DUPLICATE_VALIDATION_REQUIREMENT';
        throw error;
      }
      seen.add(id);
      const acceptedEvidenceTypes = [
        ...new Set([
          ...asArray(requirement.acceptedEvidenceTypes),
          ...asArray(requirement.evidenceTypes),
          ...asArray(requirement.proofTypes)
        ].map(String).filter(Boolean))
      ];
      return {
        requirementId: id,
        description: compactText(requirement.description, `Validation requirement ${index + 1}`),
        acceptedEvidenceTypes: acceptedEvidenceTypes.length ? acceptedEvidenceTypes : defaultEvidenceTypes,
        checks: asArray(requirement.checks).map(String).filter(Boolean).length
          ? asArray(requirement.checks).map(String).filter(Boolean)
          : ['evidence_present'],
        minimumEvidenceItems: Math.max(Number(requirement.minimumEvidenceItems || requirement.minimum_evidence_items || 1), 1),
        semanticReview: normalizeSemanticReview(requirement.semanticReview ?? requirement.semantic_review),
        manualReviewAllowed: requirement.manualReviewAllowed !== false,
        raw: requirement
      };
    });
  }

  summarize(requirements = []) {
    return asArray(requirements).map(requirement => ({
      requirementId: requirement.requirementId,
      description: requirement.description,
      acceptedEvidenceTypes: requirement.acceptedEvidenceTypes,
      checks: requirement.checks,
      minimumEvidenceItems: requirement.minimumEvidenceItems,
      semanticReview: requirement.semanticReview
    }));
  }
}

export default new TaskEvidenceRequirementService();
export { defaultEvidenceTypes, normalizeSemanticReview };
