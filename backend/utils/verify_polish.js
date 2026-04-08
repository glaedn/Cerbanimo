import pool from '../db.js';
import ImpactGraphService from '../services/ImpactGraphService.js';
import TaskRoutingService from '../services/TaskRoutingService.js';
import { verificationService } from '../services/VerificationService.js';
import ProjectHealthService from '../services/ProjectHealthService.js';

async function runVerification() {
  console.log("--- Starting Coordination Organism Polish Pass Verification ---");

  try {
    // 1. Verify Impact Depth Calculation
    console.log("Testing Impact Depth Calculation...");
    // Mock a task and outcome node
    const resProject = await pool.query("INSERT INTO projects (name, description, creator_id) VALUES ('Test Polish Project', 'Testing impact depth', 1) RETURNING id");
    const projectId = resProject.rows[0].id;

    const outcome = await ImpactGraphService.createOutcome(projectId, "Poland should be polished.");
    const outcomeNodeId = (await pool.query("SELECT id FROM impact_nodes WHERE type = 'outcome' AND entity_id = $1", [outcome.id])).rows[0].id;

    const resTask = await pool.query("INSERT INTO tasks (name, project_id, creator_id) VALUES ('Polish the door', $1, 1) RETURNING id", [projectId]);
    const taskId = resTask.rows[0].id;
    const taskNode = await ImpactGraphService.createImpactNode('task', taskId, 'Polish the door');

    await ImpactGraphService.linkNodes(taskNode.id, outcomeNodeId, 'contributes_to');

    const depth = await ImpactGraphService.calculateImpactDepth(taskId);
    console.log(`- Calculated Impact Depth for task ${taskId}: ${depth} (Expected: 1)`);

    // 2. Verify Task Scoring
    console.log("Testing Priority Scoring...");
    const score = await TaskRoutingService.calculatePriorityScore(taskId);
    console.log(`- Priority Score for task ${taskId}: ${score}`);
    const taskRes = await pool.query("SELECT impact_depth FROM tasks WHERE id = $1", [taskId]);
    console.log(`- Task impact_depth updated to: ${taskRes.rows[0].impact_depth}`);

    // 3. Verify Bad Actor Detection
    console.log("Testing Bad Actor Detection (Mocking data)...");
    // Mock 4 self-verifications in last 24h
    for (let i = 0; i < 4; i++) {
        const t = await pool.query("INSERT INTO tasks (name, project_id, creator_id, status) VALUES ('Quick Task', $1, 1, 'completed') RETURNING id", [projectId]);
        await verificationService.recordVerificationEvent(t.rows[0].id, 1, 'approved');
        await pool.query("UPDATE tasks SET submitted_by = 1 WHERE id = $1", [t.rows[0].id]);
    }
    const flags = await verificationService.detectBadActors(1);
    console.log("- Bad actor flags for user 1:", flags);
    const hasCluster = flags.some(f => f.type === 'self_verification_cluster');
    console.log(`- Self-verification cluster detected: ${hasCluster} (Expected: true)`);

    // 4. Verify Project Revival
    console.log("Testing Project Revival...");
    await pool.query("UPDATE projects SET status = 'closed', health_score = 0 WHERE id = $1", [projectId]);
    const revivedProject = await ProjectHealthService.reviveProject(projectId, 1);
    console.log(`- Project status after revival: ${revivedProject.status} (Expected: active)`);
    console.log(`- Project health_score after revival: ${revivedProject.health_score} (Expected: 0.5)`);

    const storyUnitRes = await pool.query("SELECT * FROM story_units WHERE project_id = $1 AND role = 'reviver'", [projectId]);
    console.log(`- Story unit created for revival: ${storyUnitRes.rows.length > 0} (Expected: true)`);

    console.log("--- Verification Complete ---");
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    // Cleanup (Optional - depends on if we want to keep test data)
    // await pool.query("DELETE FROM projects WHERE name = 'Test Polish Project'");
    process.exit(0);
  }
}

runVerification();
