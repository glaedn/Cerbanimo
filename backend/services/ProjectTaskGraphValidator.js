import { normalizeTaskImpactWeights } from './taskGenerator.js';
import {
  classificationDbFields,
  normalizeTaskAutomationClassification
} from './TaskAutomationClassificationService.js';

const limits = {
  name: 100,
  description: 5000,
  skill_name: 100,
  impact_label: 500
};

export function validateGeneratedGraph(generatedData = {}, projectInput = {}) {
  const findings = [];
  const rawTasks = Array.isArray(generatedData.tasks) ? generatedData.tasks : [];

  if (rawTasks.length === 0) {
    findings.push(finding('BOOTSTRAP_GRAPH_INVALID', 'tasks', 'Generated graph must include at least one task.'));
    return { valid: false, findings, tasks: [] };
  }

  const seenIds = new Set();
  const normalizedTasks = rawTasks.map((task, index) => normalizeTask(task, index, findings));

  for (const task of normalizedTasks) {
    if (task.generated_id == null) {
      findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].id`, 'Task is missing a generated id.'));
    } else if (seenIds.has(String(task.generated_id))) {
      findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].id`, `Duplicate generated task id ${task.generated_id}.`));
    } else {
      seenIds.add(String(task.generated_id));
    }

    if (!task.name) findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].name`, 'Task name is required.'));
    if (!task.description) findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].description`, 'Task description is required.'));
    if (!task.skill_name) findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].skill_name`, 'Task skill_name is required.'));
    if (task.reward_tokens < 0) findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].reward_tokens`, 'Reward tokens cannot be negative.'));
  }

  const idSet = new Set(normalizedTasks.map((task) => String(task.generated_id)));
  for (const task of normalizedTasks) {
    for (const depId of task.dependencies) {
      if (String(depId) === String(task.generated_id)) {
        findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].dependencies`, 'Task cannot depend on itself.'));
      }
      if (!idSet.has(String(depId))) {
        findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].dependencies`, `Dependency ${depId} does not reference a generated task.`));
      }
    }
  }

  findings.push(...cycleFindings(normalizedTasks));
  findings.push(...dateFindings(normalizedTasks));

  const impactSafeTasks = normalizeTaskImpactWeights(normalizedTasks);
  const valid = findings.length === 0;
  return {
    valid,
    findings,
    tasks: impactSafeTasks.map(({ index, ...task }) => task),
    rootTaskCount: impactSafeTasks.filter((task) => task.dependencies.length === 0).length,
    projectInput: {
      name: projectInput.name,
      dueDate: projectInput.dueDate ?? projectInput.due_date ?? null
    }
  };
}

function normalizeTask(task, index, findings) {
  const generatedId = task.id ?? task.generated_id;
  const startDate = normalizeDate(task.start_date, index, 'start_date', findings);
  const dueDate = normalizeDate(task.due_date, index, 'due_date', findings);
  const reward = Number(task.reward_tokens ?? 50);
  const automation = normalizeTaskAutomationClassification(task, { source: 'generated' });
  const automationFields = classificationDbFields(automation);

  return {
    ...task,
    ...automationFields,
    automation,
    index,
    generated_id: generatedId,
    id: generatedId,
    name: limitText(task.name, limits.name),
    description: limitText(task.description, limits.description),
    skill_name: limitText(task.skill_name || task.skillName, limits.skill_name),
    skill_level: safeNumber(task.skill_level, 0),
    reward_tokens: Number.isFinite(reward) ? reward : -1,
    resource_requirements: Array.isArray(task.resource_requirements) ? task.resource_requirements.map((item) => limitText(item, 200)).filter(Boolean) : [],
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    start_date: startDate,
    due_date: dueDate,
    impact_label: limitText(task.impact_label || task.impact_statement || `Contributes to the project outcome through: ${task.name || 'task'}`, limits.impact_label),
    impact_weight: safeNumber(task.impact_weight, 0),
    is_local: Boolean(task.is_local)
  };
}

function cycleFindings(tasks) {
  const findings = [];
  const byId = new Map(tasks.map((task) => [String(task.generated_id), task]));
  const visiting = new Set();
  const visited = new Set();

  function visit(task, path = []) {
    const id = String(task.generated_id);
    if (visiting.has(id)) {
      findings.push(finding('BOOTSTRAP_GRAPH_INVALID', 'dependencies', `Dependency cycle detected: ${[...path, id].join(' -> ')}.`));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const depId of task.dependencies) {
      const dep = byId.get(String(depId));
      if (dep) visit(dep, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  tasks.forEach((task) => visit(task));
  return findings;
}

function dateFindings(tasks) {
  const findings = [];
  const byId = new Map(tasks.map((task) => [String(task.generated_id), task]));
  for (const task of tasks) {
    if (task.start_date && task.due_date && new Date(task.start_date) > new Date(task.due_date)) {
      findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].due_date`, 'Task due date cannot be before its start date.'));
    }
    for (const depId of task.dependencies) {
      const dep = byId.get(String(depId));
      if (dep?.due_date && task.start_date && new Date(task.start_date) < new Date(dep.due_date)) {
        findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${task.index}].start_date`, `Task starts before dependency ${depId} can finish.`));
      }
    }
  }
  return findings;
}

function normalizeDate(value, index, field, findings) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    findings.push(finding('BOOTSTRAP_GRAPH_INVALID', `tasks[${index}].${field}`, `${field} is not parseable.`));
    return null;
  }
  return parsed.toISOString();
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function limitText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function finding(code, field, message) {
  return { code, field, message };
}
