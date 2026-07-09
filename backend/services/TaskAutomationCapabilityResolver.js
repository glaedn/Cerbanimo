import CapabilityRegistryService, { automationTemplates } from './CapabilityRegistryService.js';

const executableCapabilities = {
  'github.run_quality_checks': {
    templateKey: 'run_quality_checks',
    requiredScope: 'automation:write',
    executorEnv: 'CERBANIMO_QUALITY_CHECK_EXECUTOR'
  }
};

export function resolveTaskAutomationCapability({
  task,
  preparation,
  scopes = [],
  validationResult,
  actorUserId,
  taskAuthority = false
} = {}) {
  const automation = task?.automation || {};
  const requiredCapabilities = [
    ...new Set([
      ...(Array.isArray(automation.requirements?.capabilities) ? automation.requirements.capabilities : []),
      preparation?.capability_name
    ].filter(Boolean))
  ];
  const capabilityName = preparation?.capability_name || requiredCapabilities[0] || null;
  const reasons = [];
  const availableCapabilities = [];
  const missingCapabilities = [];
  const scopeSet = new Set(scopes);
  const definition = capabilityName ? executableCapabilities[capabilityName] : null;
  const template = definition ? automationTemplates.find((item) => item.key === definition.templateKey) : null;

  if (!capabilityName) reasons.push('CAPABILITY_NOT_REGISTERED');
  if (capabilityName && !definition) reasons.push('CAPABILITY_NOT_REGISTERED');
  if (definition && !template) reasons.push('CAPABILITY_NOT_REGISTERED');

  const executor = definition ? resolveExecutor(definition) : { available: false, reason: 'CAPABILITY_NOT_REGISTERED' };
  if (definition && !executor.available) reasons.push(executor.reason);

  const hasRequiredScope = definition ? scopeSet.has(definition.requiredScope) : false;
  const actorAuthorized = Boolean(definition && hasRequiredScope && taskAuthority);
  if (definition && !hasRequiredScope) reasons.push('ACTOR_SCOPE_MISSING');
  if (definition && hasRequiredScope && !taskAuthority) reasons.push('TASK_AUTHORITY_MISSING');

  if (validationResult && validationResult.valid === false) reasons.push('INPUTS_INCOMPLETE');
  if (task?.automation?.classification === 'human_driven') reasons.push('TASK_POLICY_BLOCKED');

  const executionAvailable = Boolean(definition && template && executor.available && actorAuthorized && validationResult?.valid !== false && task?.automation?.classification !== 'human_driven');
  if (executionAvailable && capabilityName) availableCapabilities.push(capabilityName);
  for (const capability of requiredCapabilities) {
    if (!availableCapabilities.includes(capability)) missingCapabilities.push(capability);
  }

  return {
    classification: task?.automation?.classification || 'human_driven',
    requiredCapabilities,
    availableCapabilities,
    missingCapabilities,
    actorAuthorized: Boolean(actorAuthorized),
    executionAvailable,
    templateKey: definition?.templateKey || null,
    executor: executor.name || null,
    reasons: [...new Set(reasons)]
  };
}

function resolveExecutor(definition) {
  const requested = process.env[definition.executorEnv] || '';
  if (requested === 'deterministic') {
    if (deterministicExecutorAllowed()) return { available: true, name: 'deterministic' };
    return { available: false, reason: 'PRODUCTION_SANDBOX_REQUIRED', name: 'deterministic' };
  }
  if (requested === 'local_trusted_workspace') {
    return { available: false, reason: 'EXECUTOR_NOT_CONFIGURED', name: 'local_trusted_workspace' };
  }
  return { available: false, reason: 'PRODUCTION_SANDBOX_REQUIRED' };
}

function deterministicExecutorAllowed() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  const parsed = parseDatabaseUrl(databaseUrl);
  const target = `${parsed.host || ''}/${parsed.database || ''}`.toLowerCase();
  return process.env.NODE_ENV === 'test'
    && process.env.CERBANIMO_E2E_MODE === 'true'
    && /(e2e|test)/i.test(parsed.database || '')
    && !/(neon\.tech|amazonaws\.com|render\.com|onrender\.com|prod|production)/i.test(target);
}

function parseDatabaseUrl(value) {
  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\/+/, '')
    };
  } catch {
    return { host: '', database: '' };
  }
}

export function automationTemplateForCapability(capabilityName) {
  const definition = executableCapabilities[capabilityName];
  return definition ? CapabilityRegistryService.findAutomationTemplate(definition.templateKey) : null;
}
