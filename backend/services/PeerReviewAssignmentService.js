function asArray(value) {
  return Array.isArray(value) ? value : [];
}

class PeerReviewAssignmentService {
  conflictSet({ task, bundle, round, existingAssignments = [] } = {}) {
    return new Set([
      Number(round?.submission_actor_user_id || 0),
      Number(bundle?.actor_user_id || 0),
      Number(task?.creator_id || 0),
      Number(task?.project_creator_id || 0),
      ...asArray(task?.assigned_user_ids).map(Number),
      ...existingAssignments.map(assignment => Number(assignment.reviewer_user_id))
    ].filter(Boolean));
  }

  async eligiblePeers({ client, task, bundle, round, policySnapshot, target = 5 }) {
    const existing = (await client.query(
      `SELECT reviewer_user_id, reviewer_role, status
       FROM task_review_assignments
       WHERE review_round_id = $1
         AND status IN ('offered', 'accepted', 'completed')`,
      [round.id]
    )).rows;
    const conflicts = this.conflictSet({ task, bundle, round, existingAssignments: existing });
    const users = await client.query(
      `SELECT id, username, roles, capacity_status, skills
       FROM users
       WHERE id <> ALL($1::int[])
         AND COALESCE(capacity_status, 'active') <> 'unavailable'
       ORDER BY
         CASE WHEN $2::int IS NOT NULL AND id = $2 THEN 0 ELSE 1 END,
         COALESCE(array_length(roles, 1), 0) DESC,
         id ASC
       LIMIT $3`,
      [
        Array.from(conflicts),
        task.project_creator_id || null,
        Math.max(Number(target || 5), 1)
      ]
    );
    return users.rows.map((user, index) => ({
      userId: user.id,
      reviewerUserId: user.id,
      rank: index + 1,
      eligibilitySnapshot: {
        deterministicRank: index + 1,
        capacityStatus: user.capacity_status || 'active',
        policyVersion: policySnapshot.policyVersion,
        selectionBasis: ['available_user', 'conflict_excluded', 'stable_id_order']
      },
      conflictSnapshot: {
        excludedUserIds: Array.from(conflicts),
        collaborativeCoassigneeReviewAllowed: Boolean(policySnapshot.allowCollaborativeCoassigneeReview)
      }
    }));
  }
}

export default new PeerReviewAssignmentService();
