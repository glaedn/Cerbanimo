import process from 'node:process';
import pool from '../db.js';
import boss from '../jobs/boss.js';
import TaskAccessService from './TaskAccessService.js';
import TaskEvidenceService from './TaskEvidenceService.js';
import TaskReviewPolicyService from './TaskReviewPolicyService.js';
import TaskReviewAuthorizationService from './TaskReviewAuthorizationService.js';
import PeerReviewAssignmentService from './PeerReviewAssignmentService.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function humanReviewEnabled() {
  return process.env.CERBANIMO_HUMAN_REVIEW_ENABLED === 'true';
}

function requireReason(decision, reason) {
  if (['request_changes', 'reject', 'recuse'].includes(decision) && !String(reason || '').trim()) {
    const error = new Error('A reason is required for changes, rejection, or recusal.');
    error.status = 400;
    error.code = 'REVIEW_REASON_REQUIRED';
    throw error;
  }
}

class TaskReviewService {
  featureStatus() {
    return {
      enabled: humanReviewEnabled(),
      policyVersion: 'task-review-v1',
      manifestVersionRequired: 'evidence-manifest-v2'
    };
  }

  async createRoundForValidation(client, { task, bundle, validationResult, validation, requestedBy = null }) {
    if (!humanReviewEnabled()) return null;
    const existing = (await client.query(
      `SELECT *
       FROM task_review_rounds
       WHERE bundle_id = $1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [bundle.id]
    )).rows[0] || null;
    if (existing && !['cancelled', 'superseded', 'rejected'].includes(existing.status)) return existing;

    const policySnapshot = TaskReviewPolicyService.defaultPolicy(task.review_policy || {});
    const validationFindings = (await client.query(
      `SELECT *
       FROM task_validation_findings
       WHERE validation_result_id = $1
       ORDER BY id ASC`,
      [validation.id]
    )).rows;
    const riskTier = TaskReviewPolicyService.riskTierFor({ task, bundle, validationResult, findings: validationFindings });
    const needsManualValidation = validationResult.status === 'manual_review_required'
      || validation.status === 'manual_review_required'
      || validation.overall_verdict === 'manual_review_required';
    const peerDeadline = `NOW() + INTERVAL '${Number(policySnapshot.peerDeadlineMinutes)} minutes'`;
    const round = (await client.query(
      `INSERT INTO task_review_rounds (
         task_id, bundle_id, validation_result_id, submission_actor_user_id,
         status, stage, risk_tier, policy_version, policy_snapshot,
         evidence_manifest_sha256, peer_approvals_required, peer_deadline_at
       )
       VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8, $9::jsonb,
         $10, $11, ${needsManualValidation ? 'NULL' : peerDeadline}
       )
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        task.id,
        bundle.id,
        validation.id,
        bundle.actor_user_id || requestedBy || null,
        needsManualValidation ? 'awaiting_validation_review' : 'awaiting_peer_assignment',
        needsManualValidation ? 'validation_review' : 'peer_review',
        riskTier,
        policySnapshot.policyVersion,
        JSON.stringify(policySnapshot),
        bundle.manifest_sha256,
        Number(policySnapshot.peerApprovalsRequired || 3)
      ]
    )).rows[0] || (await client.query(
      `SELECT *
       FROM task_review_rounds
       WHERE bundle_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [bundle.id]
    )).rows[0];

    await this.recordEvent(client, round, needsManualValidation ? 'review.created' : 'review.created', {
      eventKey: `round:${round.id}:created`,
      actorUserId: requestedBy,
      payload: { needsManualValidation, riskTier }
    });

    if (needsManualValidation) {
      await this.assignValidationReviewer(client, { round, task, bundle, requestedBy });
    } else {
      await this.openPeerAssignments(client, { round, task, bundle });
    }
    return round;
  }

  async assignValidationReviewer(client, { round, task, bundle, requestedBy }) {
    const reviewer = (await client.query(
      `SELECT id
       FROM users
       WHERE id <> ALL($1::int[])
       ORDER BY CASE WHEN $2::int IS NOT NULL AND id = $2 THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [[round.submission_actor_user_id, bundle.actor_user_id, task.creator_id].filter(Boolean).map(Number), task.project_creator_id || null]
    )).rows[0];
    if (!reviewer) {
      await this.recordEvent(client, round, 'validation_review.assigned', {
        eventKey: `round:${round.id}:validation-shortage`,
        payload: { shortage: true }
      });
      await this.notify(client, task.project_creator_id, 'reviewer_shortage', 'No eligible validation reviewer was available.', { taskId: task.id, roundId: round.id });
      return null;
    }
    const assignment = await this.createAssignment(client, {
      round,
      reviewerUserId: reviewer.id,
      reviewerRole: 'validation_reviewer',
      expiresAtSql: `NOW() + INTERVAL '6 hours'`,
      conflictSnapshot: { excludedContributor: round.submission_actor_user_id },
      eligibilitySnapshot: { basis: ['project_owner_or_available_reviewer'], policyVersion: round.policy_version }
    });
    await client.query(
      `UPDATE task_validation_reviews
       SET status = 'assigned',
           reviewer_id = $2,
           review_round_id = $3,
           assignment_id = $4
       WHERE validation_result_id = $1
         AND status IN ('pending', 'assigned')`,
      [round.validation_result_id, reviewer.id, round.id, assignment.id]
    );
    await this.recordEvent(client, round, 'validation_review.assigned', {
      eventKey: `round:${round.id}:validation:${assignment.id}`,
      actorUserId: requestedBy,
      payload: { assignmentId: assignment.id, reviewerUserId: reviewer.id }
    });
    await this.notify(client, reviewer.id, 'validation_review_assignment', 'You have a validation review assignment.', { taskId: task.id, roundId: round.id, assignmentId: assignment.id });
    return assignment;
  }

  async openPeerAssignments(client, { round, task, bundle }) {
    const currentRound = await this.lockRound(client, round.id);
    if (!['awaiting_peer_assignment', 'peer_review_open'].includes(currentRound.status)) return currentRound;
    const policySnapshot = currentRound.policy_snapshot || {};
    const candidates = await PeerReviewAssignmentService.eligiblePeers({
      client,
      task,
      bundle,
      round: currentRound,
      policySnapshot,
      target: policySnapshot.peerAssignmentTarget || 5
    });
    const assignments = [];
    for (const candidate of candidates) {
      assignments.push(await this.createAssignment(client, {
        round: currentRound,
        reviewerUserId: candidate.reviewerUserId,
        reviewerRole: 'peer_reviewer',
        expiresAtSql: `NOW() + INTERVAL '${Number(policySnapshot.peerDeadlineMinutes || 360)} minutes'`,
        conflictSnapshot: candidate.conflictSnapshot,
        eligibilitySnapshot: candidate.eligibilitySnapshot
      }));
    }
    const shortage = assignments.length < Number(policySnapshot.peerAssignmentTarget || 5);
    const status = assignments.length > 0 ? 'peer_review_open' : 'awaiting_peer_assignment';
    const updated = (await client.query(
      `UPDATE task_review_rounds
       SET status = $2,
           stage = 'peer_review',
           shortage_flag = $3,
           peer_deadline_at = COALESCE(peer_deadline_at, NOW() + ($4::text || ' minutes')::interval),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [currentRound.id, status, shortage, String(policySnapshot.peerDeadlineMinutes || 360)]
    )).rows[0];
    for (const assignment of assignments) {
      await this.recordEvent(client, updated, 'peer.assignment_offered', {
        eventKey: `round:${updated.id}:peer:${assignment.id}`,
        payload: { assignmentId: assignment.id, reviewerUserId: assignment.reviewer_user_id }
      });
      await this.notify(client, assignment.reviewer_user_id, 'peer_assignment', 'You have a peer Blessing review assignment.', { taskId: task.id, roundId: updated.id, assignmentId: assignment.id });
    }
    if (shortage) {
      await this.recordEvent(client, updated, 'peer.assignment_offered', {
        eventKey: `round:${updated.id}:peer-shortage`,
        payload: { shortage: true, assignmentsCreated: assignments.length, required: updated.peer_approvals_required }
      });
      await this.notify(client, task.project_creator_id, 'reviewer_shortage', 'Peer reviewer supply is below the target.', { taskId: task.id, roundId: updated.id });
    }
    await this.scheduleDeadline('task-review-peer-deadline', { reviewRoundId: updated.id }, updated.peer_deadline_at);
    return updated;
  }

  async createAssignment(client, { round, reviewerUserId, reviewerRole, expiresAtSql, conflictSnapshot = {}, eligibilitySnapshot = {} }) {
    return (await client.query(
      `INSERT INTO task_review_assignments (
         review_round_id, reviewer_user_id, reviewer_role, status, expires_at,
         conflict_snapshot, eligibility_snapshot
       )
       VALUES ($1, $2, $3, 'offered', ${expiresAtSql || 'NULL'}, $4::jsonb, $5::jsonb)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [round.id, reviewerUserId, reviewerRole, JSON.stringify(conflictSnapshot), JSON.stringify(eligibilitySnapshot)]
    )).rows[0] || (await client.query(
      `SELECT *
       FROM task_review_assignments
       WHERE review_round_id = $1 AND reviewer_user_id = $2 AND reviewer_role = $3
       ORDER BY id DESC
       LIMIT 1`,
      [round.id, reviewerUserId, reviewerRole]
    )).rows[0];
  }

  async listAssignments({ authContext }) {
    const actorUserId = authContext.actorUserId;
    const result = await pool.query(
      `SELECT a.*, r.status AS round_status, r.stage, r.risk_tier, r.peer_deadline_at, r.pm_deadline_at,
              t.name AS task_name, p.name AS project_name
       FROM task_review_assignments a
       JOIN task_review_rounds r ON r.id = a.review_round_id
       JOIN tasks t ON t.id = r.task_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE a.reviewer_user_id = $1
       ORDER BY a.updated_at DESC, a.id DESC
       LIMIT 50`,
      [actorUserId || 0]
    );
    return {
      assignments: result.rows.map(row => this.serializeAssignment(row)),
      allowedActions: {
        acceptAssignment: true,
        bless: false,
        requestChanges: false,
        reject: false,
        recuse: true,
        seal: false
      }
    };
  }

  async getAssignment({ assignmentId, authContext }) {
    const assignment = await this.findAssignment(assignmentId);
    if (!assignment) return null;
    const round = await this.findRound(assignment.review_round_id);
    const policy = await TaskReviewAuthorizationService.policyForReview({
      taskId: round.task_id,
      round,
      assignment,
      authContext
    });
    if (!policy.canViewReviewSummary.allowed) {
      const error = new Error(policy.canViewReviewSummary.reason);
      error.status = 403;
      throw error;
    }
    return this.hydrateReview({ round, assignment, authContext, includeEvidence: policy.canViewFrozenEvidence.allowed });
  }

  async acceptAssignment({ assignmentId, authContext }) {
    return this.assignmentTransition({ assignmentId, authContext, transition: 'accept' });
  }

  async declineAssignment({ assignmentId, authContext, reason }) {
    return this.assignmentTransition({ assignmentId, authContext, transition: 'decline', reason });
  }

  async recuseAssignment({ assignmentId, authContext, reason }) {
    if (!reason) {
      const error = new Error('Recusal requires a reason.');
      error.status = 400;
      throw error;
    }
    return this.assignmentTransition({ assignmentId, authContext, transition: 'recuse', reason });
  }

  async assignmentTransition({ assignmentId, authContext, transition, reason }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const assignment = await this.lockAssignment(client, assignmentId);
      if (!assignment) {
        const error = new Error('Review assignment not found.');
        error.status = 404;
        throw error;
      }
      const round = await this.lockRound(client, assignment.review_round_id);
      await TaskReviewAuthorizationService.assert({ taskId: round.task_id, round, assignment, authContext, decisionName: 'canAcceptAssignment', client });
      const status = transition === 'accept' ? 'accepted' : transition === 'decline' ? 'declined' : 'recused';
      const timeColumn = transition === 'accept' ? 'accepted_at' : transition === 'decline' ? 'declined_at' : 'recused_at';
      const updated = (await client.query(
        `UPDATE task_review_assignments
         SET status = $2,
             ${timeColumn} = NOW(),
             updated_at = NOW()
         WHERE id = $1
           AND status = 'offered'
         RETURNING *`,
        [assignment.id, status]
      )).rows[0];
      if (!updated) {
        const error = new Error('Review assignment is no longer offered.');
        error.status = 409;
        throw error;
      }
      await this.recordEvent(client, round, `${assignment.reviewer_role.replace('_reviewer', '')}.assignment_${status === 'accepted' ? 'accepted' : status}`, {
        eventKey: `assignment:${assignment.id}:${status}`,
        actorUserId: authContext.actorUserId,
        payload: { assignmentId: assignment.id, reason: reason || null }
      });
      await client.query('COMMIT');
      return this.hydrateReview({ round, assignment: updated, authContext, includeEvidence: status === 'accepted' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async decideValidationReview({ reviewId, authContext, decision, reason, requirementFindings = [] }) {
    const mapped = decision === 'accept_validation'
      ? 'approve'
      : decision === 'request_more_evidence'
        ? 'request_changes'
        : decision === 'reject_invalid_evidence'
          ? 'reject'
          : decision === 'recuse'
            ? 'recuse'
            : decision;
    requireReason(mapped, reason);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const review = (await client.query(
        `SELECT *
         FROM task_validation_reviews
         WHERE id::text = $1
         FOR UPDATE`,
        [String(reviewId)]
      )).rows[0];
      if (!review) {
        const error = new Error('Validation review not found.');
        error.status = 404;
        throw error;
      }
      const round = await this.lockRound(client, review.review_round_id);
      const assignment = await this.lockAssignment(client, review.assignment_id);
      await TaskReviewAuthorizationService.assert({ taskId: round.task_id, round, assignment, authContext, decisionName: 'canDecideValidation', client });
      if (review.status === 'completed') {
        const error = new Error('Validation review already has a terminal decision.');
        error.status = 409;
        throw error;
      }
      await this.insertDecision(client, { round, assignment, decision: mapped, reason, requirementFindings, source: 'human', actorUserId: authContext.actorUserId });
      if (mapped === 'approve') {
        await client.query(
          `UPDATE task_validation_reviews SET status = 'completed', decision = 'passed', decided_at = NOW() WHERE id = $1`,
          [review.id]
        );
        await client.query(`UPDATE task_review_assignments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [assignment.id]);
        await client.query(
          `UPDATE task_review_rounds
           SET status = 'awaiting_peer_assignment',
               stage = 'peer_review',
               updated_at = NOW()
           WHERE id = $1`,
          [round.id]
        );
        const task = await TaskAccessService.loadTask(round.task_id, client);
        const bundle = (await client.query('SELECT * FROM task_evidence_bundles WHERE id = $1 LIMIT 1', [round.bundle_id])).rows[0];
        await this.recordEvent(client, round, 'validation_review.accepted', { eventKey: `validation:${review.id}:accepted`, actorUserId: authContext.actorUserId, payload: { reason: reason || null } });
        await this.openPeerAssignments(client, { round: { ...round, status: 'awaiting_peer_assignment' }, task, bundle });
      } else if (mapped === 'request_changes') {
        await client.query(`UPDATE task_validation_reviews SET status = 'completed', decision = 'needs_more_evidence', decided_at = NOW() WHERE id = $1`, [review.id]);
        await client.query(`UPDATE task_evidence_bundles SET status = 'needs_more_evidence', updated_at = NOW() WHERE id = $1`, [round.bundle_id]);
        await client.query(`UPDATE task_review_rounds SET status = 'superseded', stage = 'closed', returned_at = NOW(), closed_at = NOW(), updated_at = NOW() WHERE id = $1`, [round.id]);
        await this.recordEvent(client, round, 'validation_review.more_evidence', { eventKey: `validation:${review.id}:more`, actorUserId: authContext.actorUserId, payload: { reason } });
      } else if (mapped === 'reject') {
        await client.query(`UPDATE task_validation_reviews SET status = 'completed', decision = 'failed', decided_at = NOW() WHERE id = $1`, [review.id]);
        await client.query(`UPDATE task_evidence_bundles SET status = 'validation_failed', updated_at = NOW() WHERE id = $1`, [round.bundle_id]);
        await client.query(`UPDATE task_review_rounds SET status = 'rejected', stage = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`, [round.id]);
        await this.recordEvent(client, round, 'validation_review.rejected', { eventKey: `validation:${review.id}:rejected`, actorUserId: authContext.actorUserId, payload: { reason } });
      } else if (mapped === 'recuse') {
        await client.query(`UPDATE task_review_assignments SET status = 'recused', recused_at = NOW(), updated_at = NOW() WHERE id = $1`, [assignment.id]);
        await this.recordEvent(client, round, 'validation_review.rejected', { eventKey: `validation:${review.id}:recused`, actorUserId: authContext.actorUserId, payload: { reason } });
      }
      await client.query('COMMIT');
      return this.getReviewStatus({ taskId: round.task_id, authContext });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async decidePeer({ roundId, authContext, assignmentId, decision, reason, requirementFindings = [] }) {
    const mapped = decision === 'bless' ? 'approve' : decision;
    requireReason(mapped, reason);
    return this.decideRound({ roundId, authContext, assignmentId, decision: mapped, reason, requirementFindings, role: 'peer_reviewer' });
  }

  async decidePm({ roundId, authContext, assignmentId, decision, reason, requirementFindings = [] }) {
    const mapped = decision === 'seal' || decision === 'apply_ritual_seal' ? 'approve' : decision;
    requireReason(mapped, reason);
    return this.decideRound({ roundId, authContext, assignmentId, decision: mapped, reason, requirementFindings, role: 'pm_reviewer' });
  }

  async decideRound({ roundId, authContext, assignmentId, decision, reason, requirementFindings, role }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const round = await this.lockRound(client, roundId);
      if (!round) {
        const error = new Error('Review round not found.');
        error.status = 404;
        throw error;
      }
      let assignment = assignmentId ? await this.lockAssignment(client, assignmentId) : null;
      if (!assignment && role === 'pm_reviewer') {
        assignment = await this.ensurePmAssignment(client, { round, authContext });
      }
      const decisionName = role === 'peer_reviewer'
        ? decision === 'approve' ? 'canBless' : 'canRequestPeerChanges'
        : 'canApplyRitualSeal';
      await TaskReviewAuthorizationService.assert({ taskId: round.task_id, round, assignment, authContext, decisionName, client });
      if (role === 'peer_reviewer' && round.status !== 'peer_review_open') {
        const error = new Error('Peer review is not open for this round.');
        error.status = 409;
        throw error;
      }
      if (role === 'pm_reviewer' && !['awaiting_pm_review', 'pm_review_open'].includes(round.status)) {
        const error = new Error('PM review is not open for this round.');
        error.status = 409;
        throw error;
      }
      await this.insertDecision(client, { round, assignment, decision, reason, requirementFindings, source: 'human', actorUserId: authContext.actorUserId });
      if (decision === 'approve' && role === 'peer_reviewer') {
        await this.recordEvent(client, round, 'peer.blessed', { eventKey: `peer:${assignment.id}:blessed`, actorUserId: authContext.actorUserId, payload: { reason: reason || null } });
        await client.query(`UPDATE task_review_assignments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [assignment.id]);
        await this.maybeSatisfyPeerGate(client, round.id);
      } else if (decision === 'approve' && role === 'pm_reviewer') {
        await this.recordEvent(client, round, 'pm.sealed', { eventKey: `pm:${assignment.id}:sealed`, actorUserId: authContext.actorUserId, payload: { reason: reason || null } });
        await client.query(`UPDATE task_review_assignments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [assignment.id]);
        await this.acceptRound(client, { roundId: round.id, method: 'human', actorUserId: authContext.actorUserId });
      } else if (decision === 'request_changes') {
        const eventType = role === 'peer_reviewer' ? 'peer.changes_requested' : 'pm.changes_requested';
        const status = role === 'peer_reviewer' ? 'peer_changes_requested' : 'pm_changes_requested';
        await client.query(`UPDATE task_review_rounds SET status = $2, returned_at = NOW(), updated_at = NOW() WHERE id = $1`, [round.id, status]);
        await this.recordEvent(client, round, eventType, { eventKey: `${eventType}:${assignment.id}`, actorUserId: authContext.actorUserId, payload: { reason, requirementFindings } });
      } else if (decision === 'reject') {
        const eventType = role === 'peer_reviewer' ? 'peer.rejected' : 'pm.rejected';
        await client.query(`UPDATE task_review_rounds SET status = 'rejected', stage = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`, [round.id]);
        await this.recordEvent(client, round, eventType, { eventKey: `${eventType}:${assignment.id}`, actorUserId: authContext.actorUserId, payload: { reason, requirementFindings } });
      } else if (decision === 'abstain' || decision === 'recuse') {
        await client.query(`UPDATE task_review_assignments SET status = $2, recused_at = CASE WHEN $2 = 'recused' THEN NOW() ELSE recused_at END, updated_at = NOW() WHERE id = $1`, [assignment.id, decision === 'recuse' ? 'recused' : 'completed']);
        await this.recordEvent(client, round, role === 'peer_reviewer' ? 'peer.rejected' : 'pm.rejected', { eventKey: `${role}:${assignment.id}:${decision}`, actorUserId: authContext.actorUserId, payload: { decision, reason } });
      }
      await client.query('COMMIT');
      return this.getReviewStatus({ taskId: round.task_id, authContext });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async maybeSatisfyPeerGate(client, roundId) {
    const round = await this.lockRound(client, roundId);
    const approvals = Number((await client.query(
      `SELECT COUNT(*)::int AS count
       FROM task_review_decisions d
       JOIN task_review_assignments a ON a.id = d.assignment_id
       WHERE d.review_round_id = $1
         AND a.reviewer_role = 'peer_reviewer'
         AND d.decision = 'approve'
         AND d.decision_source = 'human'
         AND d.supersedes_decision_id IS NULL`,
      [round.id]
    )).rows[0]?.count || 0);
    if (approvals < Number(round.peer_approvals_required || 3) || round.peer_gate_satisfied_at) {
      await client.query(`UPDATE task_review_rounds SET peer_approvals_received = $2, updated_at = NOW() WHERE id = $1`, [round.id, approvals]);
      return round;
    }
    const updated = (await client.query(
      `UPDATE task_review_rounds
       SET peer_approvals_received = $2,
           peer_gate_satisfied_at = COALESCE(peer_gate_satisfied_at, NOW()),
           peer_gate_method = COALESCE(peer_gate_method, 'human'),
           status = 'pm_review_open',
           stage = 'pm_review',
           pm_deadline_at = COALESCE(pm_deadline_at, NOW() + (((COALESCE(policy_snapshot->>'pmDeadlineMinutes', '1080')) || ' minutes')::interval)),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [round.id, approvals]
    )).rows[0];
    await this.recordEvent(client, updated, 'peer.gate_satisfied', { eventKey: `round:${round.id}:peer-gate`, payload: { method: 'human', approvals } });
    await this.ensurePmAssignment(client, { round: updated, authContext: { actorUserId: updated.submission_actor_user_id } });
    await this.scheduleDeadline('task-review-pm-deadline', { reviewRoundId: updated.id }, updated.pm_deadline_at);
    return updated;
  }

  async ensurePmAssignment(client, { round, authContext = {} }) {
    const task = await TaskAccessService.loadTask(round.task_id, client);
    const reviewerUserId = task.project_creator_id || authContext.actorUserId;
    if (!reviewerUserId) return null;
    const assignment = await this.createAssignment(client, {
      round,
      reviewerUserId,
      reviewerRole: 'pm_reviewer',
      expiresAtSql: `NOW() + INTERVAL '${Number(round.policy_snapshot?.pmDeadlineMinutes || 1080)} minutes'`,
      conflictSnapshot: { contributorSelfSealDenied: Number(reviewerUserId) === Number(round.submission_actor_user_id) },
      eligibilitySnapshot: { basis: ['project_creator'], policyVersion: round.policy_version }
    });
    await this.recordEvent(client, round, 'pm.assignment_offered', {
      eventKey: `round:${round.id}:pm:${assignment.id}`,
      payload: { assignmentId: assignment.id, reviewerUserId }
    });
    await this.notify(client, reviewerUserId, 'pm_assignment', 'A task review is ready for Ritual Seal.', { taskId: round.task_id, roundId: round.id, assignmentId: assignment.id });
    return assignment;
  }

  async acceptRound(client, { roundId, method, actorUserId = null }) {
    const round = await this.lockRound(client, roundId);
    const accepted = (await client.query(
      `UPDATE task_review_rounds
       SET status = 'accepted_pending_settlement',
           stage = 'accepted',
           pm_gate_satisfied_at = COALESCE(pm_gate_satisfied_at, NOW()),
           pm_gate_method = COALESCE(pm_gate_method, $2),
           accepted_at = COALESCE(accepted_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
         AND status IN ('pm_review_open', 'awaiting_pm_review')
       RETURNING *`,
      [round.id, method]
    )).rows[0];
    if (!accepted) return round;
    await client.query(
      `INSERT INTO task_acceptance_records (
         task_id, bundle_id, validation_result_id, review_round_id,
         evidence_manifest_sha256, peer_gate_method, pm_gate_method, policy_version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (review_round_id) DO NOTHING`,
      [
        accepted.task_id,
        accepted.bundle_id,
        accepted.validation_result_id,
        accepted.id,
        accepted.evidence_manifest_sha256,
        accepted.peer_gate_method || 'human',
        accepted.pm_gate_method || method,
        accepted.policy_version
      ]
    );
    await this.recordEvent(client, accepted, 'review.accepted', { eventKey: `round:${accepted.id}:accepted`, actorUserId, payload: { settlementStatus: 'pending' } });
    await this.notify(client, accepted.submission_actor_user_id, 'review_accepted', 'Your contribution passed validation, peer review, and project review. Settlement is pending.', { taskId: accepted.task_id, roundId: accepted.id });
    return accepted;
  }

  async handlePeerDeadline({ reviewRoundId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const round = await this.lockRound(client, reviewRoundId);
      if (!round || round.status !== 'peer_review_open') {
        await client.query('COMMIT');
        return { stale: true };
      }
      const objections = Number((await client.query(
        `SELECT COUNT(*)::int AS count
         FROM task_review_decisions
         WHERE review_round_id = $1
           AND decision IN ('request_changes', 'reject')
           AND supersedes_decision_id IS NULL`,
        [round.id]
      )).rows[0]?.count || 0);
      if (objections > 0 || !TaskReviewPolicyService.canPeerTimeoutAdvance(round)) {
        await this.recordEvent(client, round, 'peer.deadline_elapsed', {
          eventKey: `round:${round.id}:peer-deadline-blocked`,
          payload: { advanced: false, objections }
        });
        await client.query('COMMIT');
        return { advanced: false, reason: 'policy_or_objection_blocked' };
      }
      const approvals = Number((await client.query(
        `SELECT COUNT(*)::int AS count
         FROM task_review_decisions d
         JOIN task_review_assignments a ON a.id = d.assignment_id
         WHERE d.review_round_id = $1
           AND a.reviewer_role = 'peer_reviewer'
           AND d.decision = 'approve'
           AND d.decision_source = 'human'
           AND d.supersedes_decision_id IS NULL`,
        [round.id]
      )).rows[0]?.count || 0);
      const updated = (await client.query(
        `UPDATE task_review_rounds
         SET peer_approvals_received = $2,
             peer_gate_satisfied_at = COALESCE(peer_gate_satisfied_at, NOW()),
             peer_gate_method = COALESCE(peer_gate_method, 'policy_timeout'),
             status = 'pm_review_open',
             stage = 'pm_review',
             pm_deadline_at = COALESCE(pm_deadline_at, NOW() + (((COALESCE(policy_snapshot->>'pmDeadlineMinutes', '1080')) || ' minutes')::interval)),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [round.id, approvals]
      )).rows[0];
      await this.recordEvent(client, updated, 'peer.deadline_elapsed', {
        eventKey: `round:${round.id}:peer-deadline-advanced`,
        payload: { advanced: true, method: 'policy_timeout', manualApprovals: approvals }
      });
      await this.recordEvent(client, updated, 'peer.gate_satisfied', {
        eventKey: `round:${round.id}:peer-gate`,
        payload: { method: 'policy_timeout', manualApprovals: approvals }
      });
      await this.ensurePmAssignment(client, { round: updated });
      await client.query('COMMIT');
      return { advanced: true, round: this.serializeRound(updated) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handlePmDeadline({ reviewRoundId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const round = await this.lockRound(client, reviewRoundId);
      if (!round || !['pm_review_open', 'awaiting_pm_review'].includes(round.status)) {
        await client.query('COMMIT');
        return { stale: true };
      }
      const objections = Number((await client.query(
        `SELECT COUNT(*)::int AS count
         FROM task_review_decisions
         WHERE review_round_id = $1
           AND decision IN ('request_changes', 'reject')
           AND supersedes_decision_id IS NULL`,
        [round.id]
      )).rows[0]?.count || 0);
      if (objections > 0 || !round.peer_gate_satisfied_at || !TaskReviewPolicyService.canPmTimeoutAdvance(round)) {
        await this.recordEvent(client, round, 'pm.deadline_elapsed', {
          eventKey: `round:${round.id}:pm-deadline-blocked`,
          payload: { advanced: false, objections }
        });
        await client.query('COMMIT');
        return { advanced: false, reason: 'policy_or_objection_blocked' };
      }
      const accepted = await this.acceptRound(client, { roundId: round.id, method: 'policy_timeout' });
      await this.recordEvent(client, accepted, 'pm.deadline_elapsed', {
        eventKey: `round:${round.id}:pm-deadline-advanced`,
        payload: { advanced: true, method: 'policy_timeout' }
      });
      await client.query('COMMIT');
      return { advanced: true, round: this.serializeRound(accepted) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handleReviewFinalize({ reviewRoundId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const round = await this.lockRound(client, reviewRoundId);
      if (!round) {
        await client.query('COMMIT');
        return { stale: true };
      }
      if (round.status === 'accepted_pending_settlement') {
        await client.query(
          `INSERT INTO task_acceptance_records (
             task_id, bundle_id, validation_result_id, review_round_id,
             evidence_manifest_sha256, peer_gate_method, pm_gate_method, policy_version
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (review_round_id) DO NOTHING`,
          [
            round.task_id,
            round.bundle_id,
            round.validation_result_id,
            round.id,
            round.evidence_manifest_sha256,
            round.peer_gate_method || 'human',
            round.pm_gate_method || 'human',
            round.policy_version
          ]
        );
        await client.query('COMMIT');
        return { accepted: true, round: this.serializeRound(round) };
      }
      if (round.status === 'pm_review_open' && round.peer_gate_satisfied_at && round.pm_gate_satisfied_at && round.pm_gate_method) {
        const accepted = await this.acceptRound(client, { roundId: round.id, method: round.pm_gate_method });
        await client.query('COMMIT');
        return { accepted: true, round: this.serializeRound(accepted) };
      }
      await client.query('COMMIT');
      return { stale: true, status: round.status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handleAssignmentExpiry({ assignmentId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = (await client.query(
        `SELECT *
         FROM task_review_assignments
         WHERE id::text = $1 OR assignment_uuid::text = $1
         LIMIT 1`,
        [String(assignmentId)]
      )).rows[0];
      if (!existing) {
        await client.query('COMMIT');
        return { stale: true };
      }
      const round = await this.lockRound(client, existing.review_round_id);
      const assignment = await this.lockAssignment(client, existing.id);
      if (!round || !assignment || assignment.status !== 'offered') {
        await client.query('COMMIT');
        return { stale: true };
      }
      if (assignment.expires_at && new Date(assignment.expires_at).getTime() > Date.now()) {
        await client.query('COMMIT');
        return { stale: true, notExpired: true };
      }
      await client.query(
        `UPDATE task_review_assignments
         SET status = 'expired',
             updated_at = NOW()
         WHERE id = $1`,
        [assignment.id]
      );
      await this.recordEvent(client, round, `${assignment.reviewer_role.replace('_reviewer', '')}.assignment_expired`, {
        eventKey: `assignment:${assignment.id}:expired`,
        payload: { assignmentId: assignment.id }
      });
      await client.query('COMMIT');
      return { expired: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async insertDecision(client, { round, assignment, decision, reason, requirementFindings = [], source, actorUserId }) {
    return (await client.query(
      `INSERT INTO task_review_decisions (
         review_round_id, assignment_id, reviewer_user_id, decision, reason,
         requirement_findings, evidence_manifest_sha256, policy_version, decision_source
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       RETURNING *`,
      [
        round.id,
        assignment.id,
        actorUserId || assignment.reviewer_user_id,
        decision,
        reason || null,
        JSON.stringify(asArray(requirementFindings)),
        round.evidence_manifest_sha256,
        round.policy_version,
        source
      ]
    )).rows[0];
  }

  async getReviewStatus({ taskId, authContext }) {
    const rounds = await pool.query(
      `SELECT r.*,
              COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]') AS assignments,
              COALESCE(json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS decisions
       FROM task_review_rounds r
       LEFT JOIN task_review_assignments a ON a.review_round_id = r.id
       LEFT JOIN task_review_decisions d ON d.review_round_id = r.id
       WHERE r.task_id::text = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [String(taskId)]
    );
    if (rounds.rows.length === 0) {
      return {
        taskId,
        status: 'no_review_round',
        reviewFeature: this.featureStatus(),
        allowedActions: this.emptyAllowedActions()
      };
    }
    const round = rounds.rows[0];
    const policy = await TaskReviewAuthorizationService.policyForReview({ taskId: round.task_id, round, authContext });
    if (!policy.canViewReviewSummary.allowed) {
      const error = new Error(policy.canViewReviewSummary.reason);
      error.status = 403;
      throw error;
    }
    return {
      reviewFeature: this.featureStatus(),
      round: this.serializeRound(round),
      assignments: asArray(round.assignments).map(item => this.serializeAssignment(item, { publicSummary: true })),
      decisions: asArray(round.decisions).map(item => this.serializeDecision(item, { redactReviewer: true })),
      allowedActions: this.emptyAllowedActions(),
      copy: this.copyForRound(round)
    };
  }

  async hydrateReview({ round, assignment = null, authContext, includeEvidence = false }) {
    const task = await TaskAccessService.loadTask(round.task_id);
    const validation = (await pool.query(
      `SELECT *
       FROM task_validation_results
       WHERE id = $1`,
      [round.validation_result_id]
    )).rows[0] || null;
    let evidence = null;
    if (includeEvidence) {
      evidence = await TaskEvidenceService.hydrateBundle(round.bundle_id, {
        ...authContext,
        isServiceActor: true,
        scopes: [...asArray(authContext.scopes), 'evidence:service']
      });
      await pool.query(
        `INSERT INTO task_evidence_access_events (task_id, bundle_id, actor_user_id, reason, basis)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [round.task_id, round.bundle_id, authContext.actorUserId || null, 'review_assignment', JSON.stringify({ assignmentId: assignment?.id || null, roundId: round.id })]
      );
    }
    const authorization = await TaskReviewAuthorizationService.policyForReview({ taskId: round.task_id, round, assignment, authContext });
    return {
      round: this.serializeRound(round),
      assignment: assignment ? this.serializeAssignment(assignment) : null,
      task: task ? { id: task.id, name: task.name, description: task.description, status: task.status } : null,
      validation,
      evidence,
      allowedActions: {
        acceptAssignment: authorization.canAcceptAssignment.allowed,
        bless: authorization.canBless.allowed && round.status === 'peer_review_open',
        requestChanges: (authorization.canRequestPeerChanges.allowed && round.status === 'peer_review_open') || (authorization.canApplyRitualSeal.allowed && round.status === 'pm_review_open'),
        reject: authorization.canBless.allowed || authorization.canApplyRitualSeal.allowed || authorization.canDecideValidation.allowed,
        recuse: Boolean(assignment && Number(assignment.reviewer_user_id) === Number(authContext.actorUserId) && ['offered', 'accepted'].includes(assignment.status)),
        seal: authorization.canApplyRitualSeal.allowed && ['pm_review_open', 'awaiting_pm_review'].includes(round.status)
      }
    };
  }

  async findRound(id) {
    return (await pool.query(`SELECT * FROM task_review_rounds WHERE id::text = $1 OR round_uuid::text = $1 LIMIT 1`, [String(id)])).rows[0] || null;
  }

  async lockRound(client, id) {
    return (await client.query(`SELECT * FROM task_review_rounds WHERE id::text = $1 OR round_uuid::text = $1 FOR UPDATE`, [String(id)])).rows[0] || null;
  }

  async findAssignment(id) {
    return (await pool.query(`SELECT * FROM task_review_assignments WHERE id::text = $1 OR assignment_uuid::text = $1 LIMIT 1`, [String(id)])).rows[0] || null;
  }

  async lockAssignment(client, id) {
    return (await client.query(`SELECT * FROM task_review_assignments WHERE id::text = $1 OR assignment_uuid::text = $1 FOR UPDATE`, [String(id)])).rows[0] || null;
  }

  async recordEvent(client, round, eventType, { eventKey = null, actorUserId = null, payload = {} } = {}) {
    await client.query(
      `INSERT INTO task_review_events (review_round_id, task_id, event_type, event_key, actor_user_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT DO NOTHING`,
      [round.id, round.task_id, eventType, eventKey, actorUserId, JSON.stringify(payload || {})]
    );
  }

  async notify(client, userId, type, message, details = {}) {
    if (!userId) return null;
    return (await client.query(
      `INSERT INTO notifications (user_id, type, message_details, link_entity_type, link_entity_id, is_read)
       VALUES ($1, $2, $3::jsonb, 'task', $4, FALSE)
       RETURNING *`,
      [userId, type, JSON.stringify({ message, ...details }), details.taskId || null]
    )).rows[0];
  }

  async scheduleDeadline(queueName, payload, deadlineAt) {
    if (!deadlineAt) return;
    try {
      await boss.send(queueName, payload, { startAfter: new Date(deadlineAt) });
    } catch {
      // pg-boss may be unavailable in unit/E2E harnesses; persisted round deadlines remain authoritative.
    }
  }

  serializeRound(round) {
    return {
      id: round.id,
      round_uuid: round.round_uuid,
      task_id: round.task_id,
      bundle_id: round.bundle_id,
      validation_result_id: round.validation_result_id,
      status: round.status,
      stage: round.stage,
      risk_tier: round.risk_tier,
      policy_version: round.policy_version,
      peer_approvals_required: round.peer_approvals_required,
      peer_approvals_received: round.peer_approvals_received,
      peer_deadline_at: round.peer_deadline_at,
      peer_gate_method: round.peer_gate_method,
      pm_deadline_at: round.pm_deadline_at,
      pm_gate_method: round.pm_gate_method,
      shortage_flag: round.shortage_flag,
      accepted_at: round.accepted_at,
      settlement_status: round.status === 'accepted_pending_settlement' ? 'pending' : null
    };
  }

  serializeAssignment(assignment, { publicSummary = false } = {}) {
    return {
      id: assignment.id,
      assignment_uuid: assignment.assignment_uuid,
      review_round_id: assignment.review_round_id,
      reviewer_role: assignment.reviewer_role,
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      accepted_at: assignment.accepted_at,
      expires_at: assignment.expires_at,
      risk_tier: assignment.risk_tier,
      task: assignment.task_name ? { name: assignment.task_name, projectName: assignment.project_name || null } : undefined,
      reviewer_user_id: publicSummary ? undefined : assignment.reviewer_user_id
    };
  }

  serializeDecision(decision, { redactReviewer = false } = {}) {
    return {
      id: decision.id,
      decision_uuid: decision.decision_uuid,
      review_round_id: decision.review_round_id,
      assignment_id: decision.assignment_id,
      reviewer_user_id: redactReviewer ? undefined : decision.reviewer_user_id,
      decision: decision.decision,
      reason: decision.reason,
      requirement_findings: decision.requirement_findings,
      decision_source: decision.decision_source,
      created_at: decision.created_at
    };
  }

  emptyAllowedActions() {
    return {
      acceptAssignment: false,
      bless: false,
      requestChanges: false,
      reject: false,
      recuse: false,
      seal: false
    };
  }

  copyForRound(round) {
    if (round.status === 'accepted_pending_settlement') {
      return 'The contribution has passed validation, peer review, and project review. Completion settlement is still pending.';
    }
    if (['peer_changes_requested', 'pm_changes_requested'].includes(round.status)) return 'Changes were requested. The contributor can create a superseding evidence bundle.';
    if (round.status === 'awaiting_validation_review') return 'Evidence needs manual validation review.';
    if (round.status === 'peer_review_open') return `Peer Blessings: ${round.peer_approvals_received}/${round.peer_approvals_required}.`;
    if (round.status === 'pm_review_open') return 'Peer review is complete. Project review is waiting for Ritual Seal.';
    return 'Review is in progress.';
  }
}

export { humanReviewEnabled };
export default new TaskReviewService();
