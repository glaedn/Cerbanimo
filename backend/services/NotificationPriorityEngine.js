class NotificationPriorityEngine {
  /**
   * Ranks notifications based on the user's role profile.
   * @param {Array} notifications
   * @param {object} roleProfile
   * @returns {Array} Ranked notifications
   */
  rankNotifications(notifications, roleProfile) {
    const { primaryRole } = roleProfile;

    return notifications.map(notif => {
      let priority = 1; // default low priority

      // Increase priority based on role-relevance
      if (primaryRole === 'Contributor') {
        if (['task_assigned', 'task_approved', 'reward'].includes(notif.type)) priority = 3;
      } else if (primaryRole === 'Coordinator') {
        if (['task_submitted', 'need_urgent', 'blocker'].includes(notif.type)) priority = 3;
      } else if (primaryRole === 'Governance Participant') {
        if (['proposal_new', 'vote_required', 'crisis'].includes(notif.type)) priority = 3;
      }

      // System alerts are always high priority
      if (notif.type === 'system_alert' || notif.type === 'crisis') priority = 5;

      return { ...notif, priority };
    }).sort((a, b) => b.priority - a.priority);
  }
}

export default new NotificationPriorityEngine();
