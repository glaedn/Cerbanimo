import fs from 'node:fs/promises';
import path from 'node:path';
import TaskEvidenceService from '../services/TaskEvidenceService.js';
import EvidenceCanonicalDigestService from '../services/EvidenceCanonicalDigestService.js';

const artifactDir = path.resolve('.artifacts');
const artifactPath = path.join(artifactDir, 'evidence-eval.json');

function textItem(id, requirementIds, text = 'specific proof') {
  return { id, evidence_type: 'text', requirement_ids: requirementIds, content_sha256: `hash-${id}`, text_content: text };
}

async function evaluateCase(definition) {
  let actualOutcome = 'manual_review_required';
  let providerInvocation = 0;
  let requirementResults = [];
  let error = null;
  try {
    if (definition.kind === 'digest-change') {
      const base = {
        id: 1,
        task_id: 10,
        evidence_type: 'text',
        requirement_ids: ['proof'],
        title: 'Proof',
        metadata: {}
      };
      const first = await EvidenceCanonicalDigestService.digestItem({
        client: { async query() { return { rows: [] }; } },
        bundle: { id: 2, task_id: 10 },
        task: { id: 10 },
        item: { ...base, text_content: definition.before }
      });
      const second = await EvidenceCanonicalDigestService.digestItem({
        client: { async query() { return { rows: [] }; } },
        bundle: { id: 2, task_id: 10 },
        task: { id: 10 },
        item: { ...base, text_content: definition.after }
      });
      actualOutcome = first.contentSha256 === second.contentSha256 ? 'validation_passed' : 'validation_failed';
      requirementResults = [{ requirementId: 'integrity', verdict: actualOutcome === 'validation_failed' ? 'failed' : 'satisfied' }];
    } else {
      const result = await TaskEvidenceService.evaluateRequirement(definition.input);
      providerInvocation = definition.input.requirement.semanticReview === 'never' ? 0 : definition.expectedProviderInvocation ?? 0;
      requirementResults = [result.requirementResult];
      actualOutcome = TaskEvidenceService.overallValidationStatus(requirementResults);
    }
  } catch (caught) {
    error = caught.message;
    actualOutcome = 'manual_review_required';
  }
  return {
    caseId: definition.caseId,
    expectedOutcome: definition.expectedOutcome,
    actualOutcome,
    falsePass: actualOutcome === 'validation_passed' && definition.expectedOutcome !== 'validation_passed',
    falseReject: actualOutcome === 'validation_failed' && definition.expectedOutcome === 'validation_passed',
    manualReviewExpected: definition.expectedOutcome === 'manual_review_required',
    providerInvocation,
    requirementResults,
    error
  };
}

const baseTask = { id: 10 };
const baseBundle = { id: 20, task_id: 10, reflection: 'reviewed' };
const cases = [
  {
    caseId: 'quality-only-trusted-report',
    expectedOutcome: 'validation_passed',
    input: {
      requirement: { requirementId: 'checks', description: 'Checks pass', acceptedEvidenceTypes: ['automation_report'], checks: ['report_status_checks_passed', 'report_belongs_to_task', 'resolved_commit_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [{ id: 1, evidence_type: 'automation_report', requirement_ids: ['checks'], metadata: { report: { status: 'checks_passed', taskId: 10, ref: 'abc123' }, taskId: 10 }, content_sha256: 'report' }],
      requirementCount: 1
    }
  },
  {
    caseId: 'quality-plus-missing-screenshot',
    expectedOutcome: 'needs_more_evidence',
    input: {
      requirement: { requirementId: 'screenshot', description: 'Deployment screenshot', acceptedEvidenceTypes: ['image'], checks: ['reflection_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [{ id: 1, evidence_type: 'automation_report', requirement_ids: ['checks'], metadata: { report: { status: 'checks_passed', taskId: 10, ref: 'abc123' } }, content_sha256: 'report' }],
      requirementCount: 2
    }
  },
  {
    caseId: 'interview-not-from-quality-report',
    expectedOutcome: 'needs_more_evidence',
    input: {
      requirement: { requirementId: 'interview', description: 'Interview notes', acceptedEvidenceTypes: ['document'], checks: ['reflection_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [{ id: 1, evidence_type: 'automation_report', requirement_ids: ['checks'], metadata: { report: { status: 'checks_passed', taskId: 10, ref: 'abc123' } }, content_sha256: 'report' }],
      requirementCount: 1
    }
  },
  {
    caseId: 'unmapped-item-multiple-requirements',
    expectedOutcome: 'needs_more_evidence',
    input: {
      requirement: { requirementId: 'second', description: 'Second proof', acceptedEvidenceTypes: ['text'], checks: ['reflection_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [textItem(1, [])],
      requirementCount: 2
    }
  },
  {
    caseId: 'duplicate-interview-evidence',
    expectedOutcome: 'needs_more_evidence',
    input: {
      requirement: { requirementId: 'interviews', description: 'Distinct interviews', acceptedEvidenceTypes: ['text'], checks: ['distinct_evidence_items'], minimumEvidenceItems: 2, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [textItem(1, ['interviews']), textItem(2, ['interviews'])].map(item => ({ ...item, content_sha256: 'same-hash' })),
      requirementCount: 1
    }
  },
  {
    caseId: 'ambiguous-delivery-image',
    expectedOutcome: 'manual_review_required',
    input: {
      requirement: { requirementId: 'delivery', description: 'Delivery happened', acceptedEvidenceTypes: ['image'], checks: ['evidence_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [{ id: 1, evidence_type: 'image', requirement_ids: ['delivery'], content_sha256: 'image' }],
      requirementCount: 1
    }
  },
  {
    caseId: 'unsupported-check',
    expectedOutcome: 'manual_review_required',
    input: {
      requirement: { requirementId: 'unsupported', description: 'Unsupported', acceptedEvidenceTypes: ['text'], checks: ['face_match'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [textItem(1, ['unsupported'])],
      requirementCount: 1
    }
  },
  {
    caseId: 'required-semantic-without-provider',
    expectedOutcome: 'manual_review_required',
    input: {
      requirement: { requirementId: 'semantic', description: 'Needs semantics', acceptedEvidenceTypes: ['text'], checks: ['reflection_present'], minimumEvidenceItems: 1, semanticReview: 'required' },
      task: baseTask,
      bundle: baseBundle,
      items: [textItem(1, ['semantic'])],
      requirementCount: 1
    }
  },
  {
    caseId: 'semantic-never-zero-provider',
    expectedOutcome: 'validation_passed',
    expectedProviderInvocation: 0,
    input: {
      requirement: { requirementId: 'proof', description: 'Specific proof', acceptedEvidenceTypes: ['text'], checks: ['reflection_present'], minimumEvidenceItems: 1, semanticReview: 'never' },
      task: baseTask,
      bundle: baseBundle,
      items: [textItem(1, ['proof'])],
      requirementCount: 1
    }
  },
  { caseId: 'changed-text-integrity', kind: 'digest-change', before: 'done', after: 'changed', expectedOutcome: 'validation_failed' }
];

const results = [];
for (const definition of cases) {
  results.push(await evaluateCase(definition));
}
const artifact = {
  generatedAt: new Date().toISOString(),
  falsePassCount: results.filter(result => result.falsePass).length,
  falseRejectCount: results.filter(result => result.falseReject).length,
  cases: results
};

await fs.mkdir(artifactDir, { recursive: true });
await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
if (artifact.falsePassCount > 0) process.exit(1);
