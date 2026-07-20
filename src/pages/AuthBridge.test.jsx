import { describe, expect, it } from 'vitest';
import { isConsentRequiredError } from './AuthBridge.jsx';

describe('Cerbanimo auth bridge consent recovery', () => {
  it('recognizes Auth0 consent errors by code or description', () => {
    expect(isConsentRequiredError({ error: 'consent_required' })).toBe(true);
    expect(isConsentRequiredError({ message: 'Consent required for this audience' })).toBe(true);
    expect(isConsentRequiredError({ error_description: 'consent_required' })).toBe(true);
  });

  it('does not treat unrelated token errors as consent requests', () => {
    expect(isConsentRequiredError({ error: 'invalid_grant' })).toBe(false);
  });
});
