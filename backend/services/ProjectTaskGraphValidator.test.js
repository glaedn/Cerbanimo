import { describe, expect, it } from 'vitest';
import { validateGeneratedGraph } from './ProjectTaskGraphValidator.js';

const projectInput = {
  dueDate: '2026-08-15T00:00:00.000Z'
};

describe('ProjectTaskGraphValidator', () => {
  it('normalizes a valid dependency graph and impact weights', () => {
    const result = validateGeneratedGraph({
      tasks: [
        { id: 1, name: 'Research', description: 'Map needs', skill_name: 'Research', reward_tokens: 50, dependencies: [] },
        { id: 2, name: 'Launch', description: 'Run launch', skill_name: 'Operations', reward_tokens: 50, dependencies: [1] }
      ]
    }, projectInput);

    expect(result.valid).toBe(true);
    expect(result.rootTaskCount).toBe(1);
    expect(result.tasks.map(task => task.impact_weight).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('rejects missing dependencies and cycles', () => {
    const result = validateGeneratedGraph({
      tasks: [
        { id: 1, name: 'A', description: 'A task', skill_name: 'Ops', dependencies: [2] },
        { id: 2, name: 'B', description: 'B task', skill_name: 'Ops', dependencies: [1] },
        { id: 3, name: 'C', description: 'C task', skill_name: 'Ops', dependencies: [99] }
      ]
    }, projectInput);

    expect(result.valid).toBe(false);
    expect(result.findings.every(finding => finding.code === 'BOOTSTRAP_GRAPH_INVALID')).toBe(true);
    expect(result.findings.some(finding => finding.field === 'dependencies' && finding.message.includes('cycle'))).toBe(true);
    expect(result.findings.some(finding => finding.field === 'tasks[2].dependencies' && finding.message.includes('99'))).toBe(true);
  });

  it('rejects timelines that start before dependency due dates', () => {
    const result = validateGeneratedGraph({
      tasks: [
        { id: 1, name: 'A', description: 'A task', skill_name: 'Ops', dependencies: [], due_date: '2026-08-10T00:00:00.000Z' },
        { id: 2, name: 'B', description: 'B task', skill_name: 'Ops', dependencies: [1], start_date: '2026-08-01T00:00:00.000Z' }
      ]
    }, projectInput);

    expect(result.valid).toBe(false);
    expect(result.findings.some(finding => finding.field === 'tasks[1].start_date' && finding.message.includes('before dependency'))).toBe(true);
  });
});
