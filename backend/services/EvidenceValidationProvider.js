const productionHostPattern = /(neon\.tech|amazonaws\.com|render\.com|onrender\.com|prod|production)/i;

function deterministicProviderAllowed() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  let database = '';
  let host = '';
  try {
    const parsed = new URL(databaseUrl);
    database = parsed.pathname.replace(/^\/+/, '');
    host = parsed.hostname;
  } catch {
    return false;
  }
  return process.env.NODE_ENV === 'test'
    && process.env.CERBANIMO_E2E_MODE === 'true'
    && /(e2e|test)/i.test(database)
    && !productionHostPattern.test(`${host}/${database}`.toLowerCase());
}

class EvidenceValidationProvider {
  async semanticReview({ requirement, items, bundle }) {
    const requested = process.env.CERBANIMO_EVIDENCE_SEMANTIC_PROVIDER || '';
    if (!requested) {
      return {
        status: 'manual_review_required',
        provider: 'manual',
        version: 'manual-v1',
        confidence: 0,
        rationale: 'No semantic provider is configured.',
        missingEvidence: [],
        flags: ['provider_unavailable'],
        message: 'Semantic validation requires a configured provider or a human reviewer.'
      };
    }
    if (requested === 'deterministic') {
      if (!deterministicProviderAllowed()) {
        return {
          status: 'manual_review_required',
          provider: 'manual',
          version: 'manual-v1',
          confidence: 0,
          rationale: 'Deterministic provider is unavailable outside protected E2E mode.',
          missingEvidence: [],
          flags: ['provider_unavailable'],
          message: 'Deterministic semantic validation is only available in protected E2E mode.'
        };
      }
      const scenario = process.env.CERBANIMO_EVIDENCE_E2E_RESULT || 'pass';
      if (scenario === 'needs_more_evidence') {
        return { status: 'needs_more_evidence', provider: 'deterministic', version: 'deterministic-v1', confidence: 0.4, rationale: 'E2E scenario requested more evidence.', evidenceItemIds: items.map(item => item.id), missingEvidence: ['additional supporting evidence'], flags: [], message: 'Deterministic scenario requested more evidence.' };
      }
      if (scenario === 'manual_review') {
        return { status: 'manual_review_required', provider: 'deterministic', version: 'deterministic-v1', confidence: 0.2, rationale: 'E2E scenario requested manual review.', evidenceItemIds: items.map(item => item.id), missingEvidence: [], flags: ['manual_review_requested'], message: 'Deterministic scenario requested manual review.' };
      }
      if (scenario === 'malformed_output') {
        return { status: 'manual_review_required', provider: 'deterministic', version: 'deterministic-v1', confidence: 0, rationale: 'Provider output could not be parsed safely after retry.', evidenceItemIds: [], missingEvidence: [], flags: ['malformed_provider_output'], message: 'Provider output could not be parsed safely.' };
      }
      return {
        status: 'passed',
        provider: 'deterministic',
        version: 'deterministic-v1',
        confidence: 0.95,
        rationale: `Deterministic semantic review passed for ${requirement.requirementId}.`,
        missingEvidence: [],
        flags: [],
        message: `Deterministic semantic review passed for ${requirement.requirementId}.`,
        evidenceItemIds: items.map(item => item.id),
        bundleId: bundle.id
      };
    }

    return {
      status: 'manual_review_required',
      provider: requested,
      version: 'adapter-unavailable-v1',
      confidence: 0,
      rationale: 'Configured semantic provider adapter is not enabled.',
      missingEvidence: [],
      flags: ['provider_adapter_unavailable'],
      message: 'Semantic provider integration is not enabled for this environment.'
    };
  }
}

export default new EvidenceValidationProvider();
