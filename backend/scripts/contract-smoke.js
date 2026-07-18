import { apiContractSchemas, CONTRACT_SCHEMA_DIGEST, CONTRACT_VERSION } from '../../packages/api-contract/src/index.js';

const required = [
  'CanonicalTask', 'TaskAutomation', 'EvidenceBundle', 'EvidenceItem',
  'ValidationResult', 'ReviewRound', 'AcceptanceSettlement',
  'DomainEventEnvelope', 'CommandActionPreview', 'KamiyaStructuredResponse'
];
const missing = required.filter(name => !apiContractSchemas[name]);
if (missing.length) throw new Error(`API contract ${CONTRACT_VERSION} is missing: ${missing.join(', ')}`);
if (!/^sha256:[a-f0-9]{64}$/.test(CONTRACT_SCHEMA_DIGEST)) throw new Error(`API contract ${CONTRACT_VERSION} has an invalid schema digest.`);
console.log(`Cerbanimo API contract ${CONTRACT_VERSION} (${CONTRACT_SCHEMA_DIGEST}): ${required.length} canonical schemas verified.`);
