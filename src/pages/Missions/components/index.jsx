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

const UrgencyBar = ({ percentage }) => {
  // Color interpolation: Blue (low urgency) to Red (high urgency)
  // Blue: rgb(95, 240, 255) -> Cyan/Blue
  // Red: rgb(255, 92, 162) -> Pinkish Red

  const r = Math.round(95 + (255 - 95) * percentage);
  const g = Math.round(240 + (92 - 240) * percentage);
  const b = Math.round(255 + (162 - 255) * percentage);

  const color = `rgb(${r}, ${g}, ${b})`;

  return (
    <div className="urgency-container">
      <div className="urgency-label">URGENCY_LEVEL</div>
      <div className="urgency-bar">
        <div
          className="urgency-fill"
          style={{
            width: `${percentage * 100}%`,
            background: `linear-gradient(90deg, rgba(95, 240, 255, 0.3) 0%, ${color} 100%)`,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      </div>
    </div>
  );
};

export const ActiveMissionsList = () => {
  const { profile } = useUserProfile();
  const { assignedTasks, loading } = useAssignedTasks(profile?.id);
  const navigate = useNavigate();

  const processedTasks = React.useMemo(() => {
    if (!assignedTasks) return [];

    return assignedTasks
      .filter(task => task.status !== 'completed')
      .map(task => {
        const estimatedHours = (task.reward_tokens || 0) / 10;
        const now = new Date();
        const deadlineDate = task.due_date ? new Date(task.due_date) : null;

        let urgencyPercentage = 0;
        if (deadlineDate) {
          const remainingHours = (deadlineDate - now) / 3600000;
          // Urgency = Time Required / (Time Required + Time Available)
          // If time available is 0 or less, urgency is 100%
          urgencyPercentage = estimatedHours / (estimatedHours + Math.max(0, remainingHours));
        } else {
          // Default low urgency if no deadline
          urgencyPercentage = 0.1;
        }

        return {
          ...task,
          urgencyPercentage: Math.min(1, Math.max(0, urgencyPercentage))
        };
      })
      .sort((a, b) => b.urgencyPercentage - a.urgencyPercentage);
  }, [assignedTasks]);

  return (
    <div className="active-missions-list">
      <div className="orbit-section-header">
        <span className="orbit-kicker">CURRENT_ASSIGNMENTS</span>
        <h3>Active Tasks</h3>
      </div>
      <div className="missions-grid">
        {loading ? (
          <p className="placeholder-text">LOADING_TASKS...</p>
        ) : processedTasks.length > 0 ? (
          processedTasks.map(task => (
            <FocusCard
              key={task.id}
              title={task.name}
              kicker={task.project_name}
              status={task.status.toUpperCase()}
              actions={
                <div className="mission-card-actions">
                  {task.skill_name && (
                    <div className="skill-tags" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(() => {
                        const reqLevel = task.skill_level || 0;
                        const userLevel = task.user_skill_level || 0;
                        const hasLevel = userLevel >= reqLevel;

                        let levelColor = '#5FF0FF';
                        if (!hasLevel) {
                          const diff = Math.min(20, reqLevel - userLevel);
                          const ratio = diff / 20;
                          const r = Math.round(95 + (255 - 95) * ratio);
                          const g = Math.round(240 * (1 - ratio));
                          const b = Math.round(255 * (1 - ratio));
                          levelColor = `rgb(${r}, ${g}, ${b})`;
                        }

                        return (
                          <div className={hasLevel ? 'skill-chip-glow' : ''} style={{ borderRadius: '4px' }}>
                            <SignalChip
                              label={
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
                                  <span>{task.skill_name}</span>
                                  <span style={{ fontSize: '0.6rem', color: levelColor, fontWeight: 'bold' }}>
                                    Req: {reqLevel} | Your: {userLevel}
                                  </span>
                                </div>
                              }
                              type={hasLevel ? "accent" : "info"}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <button
                    className="orbit-btn primary small"
                    onClick={() => navigate(`/missions/visualizer/${task.project_id}/${task.id}`)}
                  >
                    View Mission
                  </button>
                  <button
                    className="orbit-btn ghost small"
                    onClick={() => navigate(`/missions/visualizer/${task.project_id}`)}
                  >
                    View Project
                  </button>
                </div>
              }
            >
              <UrgencyBar percentage={task.urgencyPercentage} />
            </FocusCard>
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
