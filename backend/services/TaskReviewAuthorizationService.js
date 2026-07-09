import pool from '../db.js';
import TaskAccessService from './TaskAccessService.js';

function normalizeActor(authContext = {}) {
  const actorUserId = Number(authContext.actorUserId || authContext.userId || 0);
  const roles = new Set(authContext.roles || []);
  const scopes = new Set(authContext.scopes || []);
  return {
    actorUserId: actorUserId > 0 ? actorUserId : null,
    admin: roles.has('admin'),
    serviceActor: Boolean(authContext.isServiceActor) || scopes.has('review:service'),
    roles,
    scopes
  };
}

function decision(allowed, reason, code, basis = {}) {
  return allowed
    ? { allowed: true, reason, basis }
    : { allowed: false, reason, code, basis };
}

function assignedAccepted(assignment, actor, role = null) {
  return Boolean(
    assignment
      && assignment.status === 'accepted'
      && Number(assignment.reviewer_user_id) === Number(actor.actorUserId)
      && (!role || assignment.reviewer_role === role)
  );
}

class TaskReviewAuthorizationService {
  async policyForReview({ taskId, round = null, assignment = null, authContext = {}, client = pool }) {
    const actor = normalizeActor(authContext);
    const taskPolicy = await TaskAccessService.policyForTask(taskId, authContext, client);
    const task = taskPolicy.exists ? await TaskAccessService.loadTask(taskId, client) : null;
    const projectScopedPm = Boolean(actor.actorUserId && task && Number(task.project_creator_id) === actor.actorUserId);
    const contributor = Boolean(actor.actorUserId && round?.submission_actor_user_id && Number(round.submission_actor_user_id) === actor.actorUserId);
    const acceptedAssignment = assignedAccepted(assignment, actor);
    const validationAssignment = assignedAccepted(assignment, actor, 'validation_reviewer');
    const peerAssignment = assignedAccepted(assignment, actor, 'peer_reviewer');
    const pmAssignment = assignedAccepted(assignment, actor, 'pm_reviewer');
    const reviewSummary = taskPolicy.canViewTask?.allowed || acceptedAssignment || projectScopedPm || actor.admin;
    const frozenEvidence = actor.admin || actor.serviceActor || projectScopedPm || validationAssignment || peerAssignment || pmAssignment;
    const basis = {
      actorUserId: actor.actorUserId,
      admin: actor.admin,
      serviceActor: actor.serviceActor,
      projectScopedPm,
      contributor,
      acceptedAssignment,
      reviewerRole: assignment?.reviewer_role || null,
      assignmentStatus: assignment?.status || null
    };

    return {
      exists: taskPolicy.exists,
      task,
      actor,
      basis,
      canViewReviewSummary: decision(reviewSummary, 'Review summary access authorized.', 'REVIEW_SUMMARY_DENIED', basis),
      canViewFrozenEvidence: decision(frozenEvidence, 'Frozen evidence access authorized for this review assignment.', 'REVIEW_EVIDENCE_DENIED', basis),
      canAcceptAssignment: decision(Boolean(assignment && Number(assignment.reviewer_user_id) === Number(actor.actorUserId) && assignment.status === 'offered'), 'Assignment can be accepted.', 'ASSIGNMENT_ACTION_DENIED', basis),
      canDecideValidation: decision(validationAssignment && !contributor, 'Validation reviewer may decide this assignment.', 'VALIDATION_REVIEW_DENIED', basis),
      canBless: decision(peerAssignment && !contributor, 'Peer reviewer may Bless this round.', 'PEER_REVIEW_DENIED', basis),
      canRequestPeerChanges: decision(peerAssignment && !contributor, 'Peer reviewer may request changes.', 'PEER_REVIEW_DENIED', basis),
      canApplyRitualSeal: decision((pmAssignment || projectScopedPm || actor.admin) && !contributor, 'Project-scoped PM may seal this round.', 'PM_REVIEW_DENIED', basis),
      canDelegatePmReview: decision(projectScopedPm || actor.admin, 'PM delegation authorized.', 'PM_DELEGATION_DENIED', basis),
      canAdminOverride: decision(actor.admin, 'Admin override authorized.', 'ADMIN_OVERRIDE_DENIED', basis)
    };
  }

  async assert({ taskId, round = null, assignment = null, authContext = {}, decisionName, client = pool }) {
    const policy = await this.policyForReview({ taskId, round, assignment, authContext, client });
    if (!policy[decisionName]?.allowed) {
      const error = new Error(policy[decisionName]?.reason || 'Review action is not authorized.');
      error.status = 403;
      error.code = policy[decisionName]?.code || 'REVIEW_AUTHORIZATION_DENIED';
      throw error;
    }
    return policy;
  }
}

export { normalizeActor };
export default new TaskReviewAuthorizationService();
