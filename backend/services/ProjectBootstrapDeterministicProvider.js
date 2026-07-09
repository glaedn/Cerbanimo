import fs from 'fs/promises';
import path from 'path';

const productionHostPattern = /(neon\.tech|amazonaws\.com|render\.com|onrender\.com|prod|production)/i;
const defaultScenario = 'success_slow';
const attemptCounts = new Map();
const BOOTSTRAP_PROVIDER_TIMEOUT = 'BOOTSTRAP_PROVIDER_TIMEOUT';
const BOOTSTRAP_PROVIDER_UNAVAILABLE = 'BOOTSTRAP_PROVIDER_UNAVAILABLE';

export function createDeterministicBootstrapGenerators() {
  assertDeterministicProviderAllowed();

  const generatePlan = async (name, description, tags, _userId, dueDate, outcomeStatement, options = {}) => {
    const scenario = scenarioFrom(options);
    const runId = safeId(options.e2eRunId || 'default');
    const controlDir = options.e2eControlDir || process.env.CERBANIMO_E2E_PROVIDER_CONTROL_DIR;

    if (scenario === 'hold_before_persist') {
      await waitForRelease(controlDir, runId);
    }

    if (scenario === 'timeout_once_then_success') {
      const key = `${runId}:${scenario}`;
      const attempts = attemptCounts.get(key) || 0;
      attemptCounts.set(key, attempts + 1);
      if (attempts === 0) {
        throw bootstrapError(
          BOOTSTRAP_PROVIDER_TIMEOUT,
          'Deterministic provider timed out once for retry coverage.',
          'generateProjectPlan',
          true,
          { scenario, runId }
        );
      }
    }

    await delay(scenario === 'success_slow' ? 900 : 150);

    const projectName = name || 'Build a Democratic Digital Economy';
    const projectDescription = description || 'Design and implement a democratic digital economic system.';
    const outcome = outcomeStatement || 'A working platform where groups coordinate without fixed hierarchy.';

    return {
      projectPlan: [
        `Project: ${projectName}`,
        projectDescription,
        `Outcome: ${outcome}`,
        `Tags: ${(Array.isArray(tags) ? tags : []).join(', ')}`
      ].join('\n\n'),
      tasks: scenario === 'invalid_cycle'
        ? invalidCycleTasks(dueDate)
        : validTasks(dueDate)
    };
  };

  return {
    autogeneratePlan: generatePlan,
    autoGenerateTasks: async (name, description, tags, userId, dueDate, outcomeStatement, options = {}) => {
      const plan = await generatePlan(name, description, tags, userId, dueDate, outcomeStatement, options);
      return { tasks: plan.tasks };
    }
  };
}

export function assertDeterministicProviderAllowed() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  const parsed = parseDatabaseUrl(databaseUrl);
  const target = `${parsed.host || ''}/${parsed.database || ''}`.toLowerCase();

  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Deterministic project bootstrap provider requires NODE_ENV=test.');
  }
  if (process.env.CERBANIMO_E2E_MODE !== 'true') {
    throw new Error('Deterministic project bootstrap provider requires CERBANIMO_E2E_MODE=true.');
  }
  if (!/(e2e|test)/i.test(parsed.database || '')) {
    throw new Error('Deterministic project bootstrap provider requires a database name containing e2e or test.');
  }
  if (productionHostPattern.test(target)) {
    throw new Error('Deterministic project bootstrap provider refused a production-like database host or name.');
  }
}

function validTasks(dueDate) {
  const end = dueDate ? new Date(dueDate) : new Date('2027-01-02T00:00:00.000Z');
  const start = new Date(end);
  start.setMonth(start.getMonth() - 5);
  const mid = new Date(start);
  mid.setMonth(mid.getMonth() + 2);
  const late = new Date(start);
  late.setMonth(late.getMonth() + 4);

  return [
    {
      id: 'governance-map',
      name: 'Map governance requirements',
      description: 'Interview prospective groups and define constitution decision flows.',
      skill_name: 'Governance Design',
      skill_level: 2,
      reward_tokens: 50,
      dependencies: [],
      start_date: isoDate(start),
      due_date: isoDate(mid),
      impact_label: 'Clarifies how democratic group constitutions should work.',
      impact_weight: 35,
      automation_classification: 'human_driven',
      automation_confidence: 0.91,
      automation_rationale: 'This task requires stakeholder interviews, judgment, and consent-aware governance research.',
      required_human_inputs: [],
      automation_requirements: {},
      validation_requirements: [
        {
          requirementId: 'interview-notes',
          description: 'Research notes summarize stakeholder input and consent constraints.',
          proofTypes: ['document'],
          checks: ['human_review']
        }
      ]
    },
    {
      id: 'voting-prototype',
      name: 'Prototype constitution voting',
      description: 'Build the first democratic constitution proposal and revision workflow.',
      skill_name: 'Product Engineering',
      skill_level: 3,
      reward_tokens: 80,
      dependencies: [],
      start_date: isoDate(start),
      due_date: isoDate(mid),
      impact_label: 'Creates the first usable collective decision mechanism.',
      impact_weight: 40,
      automation_classification: 'assisted_automation',
      automation_confidence: 0.78,
      automation_rationale: 'Kamiya can help implement the prototype after repository, branch, constraints, and acceptance criteria are supplied.',
      required_human_inputs: [
        {
          key: 'repository',
          label: 'Repository',
          description: 'The repository where the voting prototype should be implemented.',
          inputType: 'repository',
          required: true,
          sensitive: false
        },
        {
          key: 'target_branch',
          label: 'Target branch',
          description: 'The branch or base branch to use for implementation work.',
          inputType: 'text',
          required: true,
          sensitive: false
        },
        {
          key: 'acceptance_criteria',
          label: 'Acceptance criteria',
          description: 'The behavior the prototype must satisfy before review.',
          inputType: 'long_text',
          required: true,
          sensitive: false
        },
        {
          key: 'pull_request_approval',
          label: 'Pull request approval',
          description: 'Approval boundary before any pull request is opened.',
          inputType: 'approval',
          required: true,
          sensitive: false
        }
      ],
      automation_requirements: {
        capabilities: ['github.generate_pull_request'],
        tools: ['git', 'npm'],
        externalServices: ['github'],
        permissions: ['repository:read', 'pull_request:write'],
        expectedArtifacts: ['implementation-plan', 'pull-request-draft'],
        estimatedDurationMinutes: 45,
        networkAccess: 'restricted'
      },
      validation_requirements: [
        {
          requirementId: 'criteria-reviewed',
          description: 'A person reviews generated implementation against acceptance criteria before external effects.',
          proofTypes: ['review_note'],
          checks: ['human_approval']
        }
      ]
    },
    {
      id: 'coordination-ledger',
      name: 'Run baseline repository quality checks',
      description: 'Run the known repository quality-check command and return a bounded quality-check report.',
      skill_name: 'Quality Assurance',
      skill_level: 2,
      reward_tokens: 70,
      dependencies: [],
      start_date: isoDate(start),
      due_date: isoDate(late),
      impact_label: 'Verifies the implementation baseline before deeper coordination work proceeds.',
      impact_weight: 25,
      automation_classification: 'fully_automatable',
      automation_confidence: 0.86,
      automation_rationale: 'The task is bounded digital work with a known capability and expected quality-check report.',
      required_human_inputs: [],
      automation_requirements: {
        capabilities: ['github.run_quality_checks'],
        tools: ['git', 'npm'],
        externalServices: ['github'],
        permissions: ['repository:read', 'checks:run'],
        expectedArtifacts: ['quality-check-report'],
        estimatedDurationMinutes: 10,
        networkAccess: 'restricted'
      },
      validation_requirements: [
        {
          requirementId: 'checks-pass',
          description: 'The configured quality-check automation report belongs to this task and passed.',
          proofTypes: ['automation_report'],
          checks: ['report_status_checks_passed', 'report_belongs_to_task', 'resolved_commit_present'],
          semanticReview: 'never'
        }
      ]
    }
  ];
}

function invalidCycleTasks(dueDate) {
  const end = dueDate ? new Date(dueDate) : new Date('2027-01-02T00:00:00.000Z');
  const start = new Date(end);
  start.setMonth(start.getMonth() - 5);
  const due = new Date(start);
  due.setMonth(due.getMonth() + 1);

  return [
    {
      id: 'cycle-a',
      name: 'Cycle A',
      description: 'Invalid task used to prove graph blocking.',
      skill_name: 'Validation',
      reward_tokens: 10,
      dependencies: ['cycle-b'],
      start_date: isoDate(start),
      due_date: isoDate(due),
      automation_classification: 'human_driven',
      automation_rationale: 'Invalid graph fixture task defaults to human-driven classification.',
      required_human_inputs: [],
      automation_requirements: {},
      validation_requirements: []
    },
    {
      id: 'cycle-b',
      name: 'Cycle B',
      description: 'Invalid dependent task used to prove graph blocking.',
      skill_name: 'Validation',
      reward_tokens: 10,
      dependencies: ['cycle-a'],
      start_date: isoDate(start),
      due_date: isoDate(due),
      automation_classification: 'human_driven',
      automation_rationale: 'Invalid graph fixture task defaults to human-driven classification.',
      required_human_inputs: [],
      automation_requirements: {},
      validation_requirements: []
    }
  ];
}

async function waitForRelease(controlDir, runId) {
  if (!controlDir) {
    throw bootstrapError(
      BOOTSTRAP_PROVIDER_UNAVAILABLE,
      'hold_before_persist requires CERBANIMO_E2E_PROVIDER_CONTROL_DIR.',
      'generateProjectPlan',
      false,
      { runId }
    );
  }

  await fs.mkdir(controlDir, { recursive: true });
  const holdPath = path.join(controlDir, `${runId}.hold`);
  const releasePath = path.join(controlDir, `${runId}.release`);
  await fs.writeFile(holdPath, JSON.stringify({ runId, heldAt: new Date().toISOString() }));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await fileExists(releasePath)) return;
    await delay(150);
  }

  throw bootstrapError(
    BOOTSTRAP_PROVIDER_TIMEOUT,
    'Timed out waiting for deterministic hold release.',
    'generateProjectPlan',
    true,
    { runId }
  );
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function bootstrapError(code, message, stage, retryable, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.stage = stage;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function scenarioFrom(options = {}) {
  return String(options.e2eScenario || process.env.CERBANIMO_E2E_PROVIDER_SCENARIO || defaultScenario);
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

function safeId(value) {
  return String(value || 'default').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
}

function isoDate(date) {
  return new Date(date).toISOString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
