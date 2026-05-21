import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import { api } from '../../../utils/api';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects';
import useAssignedTasks from '../../../hooks/useAssignedTasks';
import './MissionsComponents.css';

export const MissionPulse = () => {
  const { profile } = useUserProfile();
  const { projects } = useUserProjects(profile?.id);
  const { assignedTasks } = useAssignedTasks(profile?.id);

  const sysLoad = React.useMemo(() => {
    if (!assignedTasks) return 'NOMINAL';
    const now = new Date();
    const urgentTasks = assignedTasks.filter(t => {
      if (!t.deadline) return false;
      const deadline = new Date(t.deadline);
      const diff = deadline - now;
      return diff > 0 && diff < 48 * 60 * 60 * 1000;
    });

    if (urgentTasks.length > 3) return 'CRITICAL';
    if (urgentTasks.length > 0) return 'ELEVATED';
    return 'NOMINAL';
  }, [assignedTasks]);

  return (
    <div className="mission-pulse">
      <div className="orbit-section-header">
        <span className="orbit-kicker">OPERATIONAL_AWARENESS</span>
        <h3>Mission Pulse</h3>
      </div>
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="pulse-label">ACTIVE_PROJECTS</span>
          <span className="pulse-value">{projects?.length || 0}</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">ASSIGNED_TASKS</span>
          <span className="pulse-value">{assignedTasks?.length || 0}</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">SYS_LOAD</span>
          <span className="pulse-value">{sysLoad}</span>
        </div>
      </div>
    </div>
  );
};

export const ActiveMissionsList = () => {
  const { profile } = useUserProfile();
  const { assignedTasks, loading } = useAssignedTasks(profile?.id);
  const navigate = useNavigate();

  return (
    <div className="active-missions-list">
      <div className="orbit-section-header">
        <span className="orbit-kicker">CURRENT_ASSIGNMENTS</span>
        <h3>Active Tasks</h3>
      </div>
      <div className="missions-grid">
        {loading ? (
          <p className="placeholder-text">LOADING_TASKS...</p>
        ) : assignedTasks?.length > 0 ? (
          assignedTasks.map(task => (
            <FocusCard
              key={task.id}
              title={task.name}
              kicker={task.projectName}
              status={task.status.toUpperCase()}
              actionLabel="Execute Task"
              onAction={() => navigate(`/missions/visualizer/${task.projectId}/${task.id}`)}
            />
          ))
        ) : (
          <p className="empty-state">No tasks currently assigned. Browse projects to contribute.</p>
        )}
      </div>
    </div>
  );
};

export const ReviewQueue = () => {
  const [reviewItems, setReviewItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchReviewItems = async () => {
      try {
        setLoading(true);
        const response = await api.get('/tasks?status=submitted');
        setReviewItems(response.data || []);
      } catch (err) {
        console.error('Error fetching review items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewItems();
  }, []);

  return (
    <div className="review-queue">
      <div className="orbit-section-header">
        <span className="orbit-kicker">QUALITY_ASSURANCE</span>
        <h3>Review Queue</h3>
      </div>
      <ExpandablePanel
        title="Pending Contributions"
        summary={loading ? "Loading..." : `${reviewItems.length} items awaiting your approval`}
      >
        {reviewItems.length > 0 ? (
          reviewItems.map(item => (
            <div key={item.id} className="review-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ margin: 0 }}>{item.name}</p>
              <SignalChip label="Review" type="info" />
            </div>
          ))
        ) : (
          <p className="empty-state" style={{ fontSize: '0.8rem', opacity: 0.7 }}>No items pending review.</p>
        )}
      </ExpandablePanel>
    </div>
  );
};
