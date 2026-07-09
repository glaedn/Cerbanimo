import crypto from 'crypto';

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

const urlProtocols = new Set(['http:', 'https:']);

export function validatePreparationInputs(schema = [], values = {}, options = {}) {
  const errors = [];
  const findings = [];
  const sanitized = {};
  const fieldSchemas = Array.isArray(schema) ? schema : [];
  const seen = new Set();
  const knownKeys = new Set();
  const approvalFields = [];

  for (const field of fieldSchemas) {
    const key = safeKey(field?.key);
    if (!key) continue;
    if (seen.has(key)) {
      errors.push(error(key, 'DUPLICATE_SCHEMA_KEY', 'Input schema contains a duplicate key.'));
      continue;
    }
    seen.add(key);
    knownKeys.add(key);

    const inputType = allowedInputTypes.has(field.inputType) ? field.inputType : 'text';
    const rawValue = values?.[key];
    const required = field.required !== false;

    if (required && isBlank(rawValue)) {
      errors.push(error(key, 'REQUIRED', `${field.label || key} is required.`));
      continue;
    }
    if (!required && isBlank(rawValue)) continue;
    if (field.sensitive && inputType !== 'secret_reference') {
      errors.push(error(key, 'RAW_SENSITIVE_VALUE_REJECTED', 'Sensitive values must be supplied as secret references.'));
      continue;
    }

    if (inputType === 'approval') {
      approvalFields.push({ key, field, value: rawValue });
      continue;
    }

    const normalized = normalizeValue({ key, field, inputType, value: rawValue, options, errors });
    if (normalized.ok) sanitized[key] = normalized.value;
  }

  const effectSnapshot = stableStringify(sanitized);
  const effectHash = hashEffectSnapshot(effectSnapshot);
  for (const approval of approvalFields) {
    const normalized = normalizeApproval({
      key: approval.key,
      field: approval.field,
      value: approval.value,
      options,
      effectSnapshot,
      effectHash,
      errors
    });
    if (normalized.ok) sanitized[approval.key] = normalized.value;
  }

  for (const key of Object.keys(values || {})) {
    if (!knownKeys.has(key)) {
      findings.push({ key, code: 'UNKNOWN_INPUT_IGNORED', message: 'Unknown input key was ignored.' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    findings,
    sanitizedValues: sanitized
  };
}

export function qualityCheckInputSchema() {
  return [
    {
      key: 'repository',
      label: 'Repository',
      description: 'Repository to check, formatted as owner/name.',
      inputType: 'repository',
      required: true,
      sensitive: false
    },
    {
      key: 'ref',
      label: 'Ref',
      description: 'Branch, tag, or commit SHA to check.',
      inputType: 'text',
      required: true,
      sensitive: false
    },
    {
      key: 'checkProfile',
      label: 'Check profile',
      description: 'Server-defined quality-check profile.',
      inputType: 'choice',
      required: true,
      sensitive: false,
      options: [{ value: 'node_standard', label: 'Node standard' }]
    },
    {
      key: 'approval',
      label: 'Quality-check approval',
      description: 'Approval to run repository code in the configured quality-check executor. This will not modify, push, merge, or deploy code.',
      inputType: 'approval',
      required: true,
      sensitive: false
    }
  ];
}

function normalizeValue({ key, field, inputType, value, options, errors }) {
  if (inputType === 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      errors.push(error(key, 'TYPE_NUMBER', `${field.label || key} must be a number.`));
      return { ok: false };
    }
    if (field.minimum != null && parsed < Number(field.minimum)) {
      errors.push(error(key, 'NUMBER_MINIMUM', `${field.label || key} is below the minimum.`));
      return { ok: false };
    }
    if (field.maximum != null && parsed > Number(field.maximum)) {
      errors.push(error(key, 'NUMBER_MAXIMUM', `${field.label || key} is above the maximum.`));
      return { ok: false };
    }
    return { ok: true, value: parsed };
  }

  if (inputType === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(error(key, 'TYPE_BOOLEAN_STRICT', `${field.label || key} must be a JSON boolean.`));
      return { ok: false };
    }
    return { ok: true, value };
  }

  if (inputType === 'date') {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      errors.push(error(key, 'TYPE_DATE', `${field.label || key} must be a valid date.`));
      return { ok: false };
    }
    return { ok: true, value: date.toISOString().slice(0, 10) };
  }

  if (inputType === 'url') {
    try {
      const url = new URL(String(value));
      if (!urlProtocols.has(url.protocol)) {
        errors.push(error(key, 'URL_PROTOCOL', `${field.label || key} must use http or https.`));
        return { ok: false };
      }
      return { ok: true, value: url.toString() };
    } catch {
      errors.push(error(key, 'TYPE_URL', `${field.label || key} must be a valid URL.`));
      return { ok: false };
    }
  }

  if (inputType === 'repository') {
    const repository = String(value || '').trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
      errors.push(error(key, 'REPOSITORY_FORMAT', `${field.label || key} must be formatted as owner/name.`));
      return { ok: false };
    }
    return { ok: true, value: repository };
  }

  if (inputType === 'choice') {
    const allowed = Array.isArray(field.options) ? field.options.map((option) => String(option.value)) : [];
    const selected = String(value || '').trim();
    if (allowed.length > 0 && !allowed.includes(selected)) {
      errors.push(error(key, 'CHOICE_INVALID', `${field.label || key} must be one of the allowed values.`));
      return { ok: false };
    }
    return { ok: true, value: selected };
  }

  if (inputType === 'secret_reference') {
    const reference = String(value || '').trim();
    if (!/^(secret|secret_ref):[A-Za-z0-9_.:-]+$/.test(reference)) {
      errors.push(error(key, 'SECRET_REFERENCE_INVALID', `${field.label || key} must be a secret reference, not a raw secret.`));
      return { ok: false };
    }
    if (typeof options.resolveSecretReference !== 'function') {
      errors.push(error(key, 'SECRET_REFERENCE_UNSUPPORTED', 'Secret references require an authoritative secret registry.'));
      return { ok: false };
    }
    const resolved = options.resolveSecretReference(reference, { actorUserId: options.actorUserId });
    if (!resolved?.ok) {
      errors.push(error(key, 'SECRET_REFERENCE_DENIED', 'Secret reference was not found or is not accessible to this actor.'));
      return { ok: false };
    }
    return { ok: true, value: { secretReference: reference, redacted: true } };
  }

  if (inputType === 'file') {
    const fileReference = String(value || '').trim();
    if (!/^[A-Za-z0-9_.:/-]{1,240}$/.test(fileReference)) {
      errors.push(error(key, 'FILE_REFERENCE_INVALID', `${field.label || key} must be a valid file or artifact reference.`));
      return { ok: false };
    }
    if (typeof options.resolveFileReference !== 'function') {
      errors.push(error(key, 'FILE_REFERENCE_UNSUPPORTED', 'File references require an authoritative artifact registry.'));
      return { ok: false };
    }
    const resolved = options.resolveFileReference(fileReference, { actorUserId: options.actorUserId });
    if (!resolved?.ok) {
      errors.push(error(key, 'FILE_REFERENCE_DENIED', 'File reference was not found or is not accessible to this actor.'));
      return { ok: false };
    }
    return { ok: true, value: fileReference };
  }

  const maxLength = inputType === 'long_text' ? 5000 : 500;
  return { ok: true, value: limitText(value, maxLength) };
}

function normalizeApproval({ key, field, value, options, effectSnapshot, effectHash, errors }) {
  const existing = typeof value === 'object' && value !== null ? value : null;
  const approved = existing ? existing.approved === true : value === true;
  if (!approved) {
    errors.push(error(key, 'APPROVAL_REQUIRED', `${field.label || key} requires explicit approval.`));
    return { ok: false };
  }

  if (existing?.effectHash && existing.effectHash !== effectHash) {
    errors.push(error(key, 'APPROVAL_STALE', `${field.label || key} must be reapproved because effect-relevant inputs changed.`));
    return { ok: false };
  }

  if (existing && !existing.effectHash && existing.approvedAt) {
    errors.push(error(key, 'APPROVAL_EFFECT_SNAPSHOT_REQUIRED', `${field.label || key} must be reapproved with the current effect summary.`));
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      approved: true,
      approvedAt: existing?.approvedAt || new Date().toISOString(),
      actorUserId: existing?.actorUserId || options.actorUserId || null,
      statement: existing?.statement || limitText(field.description || 'Explicit approval captured.', 500),
      statementVersion: existing?.statementVersion || field.statementVersion || '1',
      effectSummary: limitText(effectSnapshot, 1000),
      effectHash
    }
  };
}

function error(key, code, message) {
  return { key, code, message };
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function safeKey(value) {
  return String(value || '').trim();
}

function limitText(value, maxLength) {
  const text = String(value || '').trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashEffectSnapshot(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
