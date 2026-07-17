import { apiContractSchemas, CONTRACT_VERSION } from '../../packages/api-contract/src/index.js';

const required = [
  'CanonicalTask', 'TaskAutomation', 'EvidenceBundle', 'EvidenceItem',
  'ValidationResult', 'ReviewRound', 'AcceptanceSettlement',
  'DomainEventEnvelope', 'CommandActionPreview', 'KamiyaStructuredResponse'
];
const missing = required.filter(name => !apiContractSchemas[name]);
if (missing.length) throw new Error(`API contract ${CONTRACT_VERSION} is missing: ${missing.join(', ')}`);
console.log(`Cerbanimo API contract ${CONTRACT_VERSION}: ${required.length} canonical schemas verified.`);
