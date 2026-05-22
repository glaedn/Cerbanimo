import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useRelevantTasks from '../../../hooks/useRelevantTasks';
import useAssignedTasks from '../../../hooks/useAssignedTasks';
import './OrbitComponents.css';

export const FocusPanel = () => {
  return (
    <div className="orbit-focus-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">SYSTEMS_ACTIVE</span>
        <h3>Current Focus</h3>
      </div>

      <FocusCard
        title="Complete Regional Infrastructure Audit"
        description="Review the latest spatial strain signals and approve pending maintenance tasks in Sector 7. Your coordination is required for deployment."
        actionLabel="Resume Execution"
        onAction={() => console.log('Resume Action')}
      />

      <div className="secondary-focus-grid">
        <div className="mini-focus-item">
          <SignalChip label="Urgent" type="error" />
          <span>Approve Task #402</span>
        </div>
        <div className="mini-focus-item">
          <SignalChip label="Sync" type="info" />
          <span>Coordinate with 'Nexus' Guild</span>
        </div>
      </div>
    </div>
  );
};

export const MomentumPanel = () => {
  const { profile } = useUserProfile();
  const [impactTrend, setImpactTrend] = useState('STABLE');

  useEffect(() => {
    const fetchImpactTrend = async () => {
      if (profile?.id) {
        try {
          const communityId = profile.primary_community_id || 1;
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/impact-receipts/community/${communityId}`);
          const receipts = res.data;

          if (receipts.length > 5) {
            setImpactTrend('RISING');
          } else {
            setImpactTrend('STABLE');
          }
        } catch (err) {
          console.error('Error fetching impact trend:', err);
        }
      }
    };
    fetchImpactTrend();
  }, [profile?.id, profile?.primary_community_id]);
  const exp = profile?.experience || { total_xp: 0, current_level: 0, xp_for_next_level: 0 };

  // Calculate progress to next level
  const xpCurrentLevel = Math.pow((exp.current_level - 1), 2) * 40;
  const xpNextLevel = Math.pow(exp.current_level, 2) * 40;
  const progressInLevel = exp.total_xp - xpCurrentLevel;
  const totalInLevel = xpNextLevel - xpCurrentLevel;
  const progressPercent = totalInLevel > 0 ? Math.min(100, Math.max(0, (progressInLevel / totalInLevel) * 100)) : 0;

  return (
    <div className="orbit-momentum-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">PERSONAL_GROWTH</span>
        <h3>Momentum</h3>
      </div>
      <div className="momentum-grid">
        <div className="momentum-stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL_XP</span>
            <span className="stat-value">{exp.total_xp.toLocaleString()}</span>
          </div>
          <div className="stat-progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="stat-sub">Level {exp.current_level} &bull; {exp.xp_for_next_level.toLocaleString()} XP to Level {exp.current_level + 1}</span>
        </div>

        <div className="momentum-mini-stats">
          <div className="mini-stat">
            <span className="mini-label">CREDITS</span>
            <span className="mini-value">{profile?.tokens?.toLocaleString() || 0}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">IMPACT</span>
            <span className="mini-value">{impactTrend}</span>
          </div>
        </div>
      </div>

      <div className="skill-growth-preview">
        <h4>Top Skills</h4>
        {profile?.skills?.length > 0 ? (
          profile.skills.slice(0, 3).map(skill => (
            <div key={skill.id} className="skill-bar">
              <span>{skill.name}</span>
              <div className="bar"><div className="fill" style={{ width: `${Math.min(100, (skill.exp / 1000) * 100)}%` }}></div></div>
              <span className="skill-lvl">Lvl {skill.level}</span>
            </div>
          ))
        ) : (
          <p className="empty-state">No skills registered yet. Start a mission to earn XP.</p>
        )}
      </div>
    </div>
  );
};

export const ConstellationActivity = () => {
  const { profile } = useUserProfile();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (profile?.id) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${profile.id}/chronicle`);
          const activities = res.data.slice(0, 5).map(item => ({
            id: item.id,
            type: 'story',
            message: item.reflection || `Completed task in ${item.project_name}`,
            time: new Date(item.created_at).toLocaleDateString()
          }));
          setEvents(activities);
        } catch (err) {
          console.error('Error fetching chronicle for activity feed:', err);
        }
      }
    };
    fetchActivity();
  }, [profile?.id]);

  return (
    <div className="orbit-constellation-activity">
      <div className="orbit-section-header">
        <span className="orbit-kicker">NETWORK_SIGNALS</span>
        <h3>Constellation Activity</h3>
      </div>
      <div className="chronicle-items">
        {events.map((event) => (
          <div key={event.id} className="chronicle-item">
            <div className={`event-dot ${event.type}`}></div>
            <div className="event-content">
              <p>{event.message}</p>
              <small>{event.time}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OpportunityPanel = () => {
  const { profile } = useUserProfile();
  const { relevantTasks, loading } = useRelevantTasks(profile?.id);

  return (
    <div className="orbit-opportunity-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">LOCAL_NEED_MATCHES</span>
        <h3>Nearby Opportunities</h3>
      </div>
      <div className="opportunity-list">
        {loading ? (
          <p className="placeholder-text">SCANNING_FOR_MATCHES...</p>
        ) : relevantTasks?.length > 0 ? (
          relevantTasks.slice(0, 3).map(task => (
            <ExpandablePanel
              key={task.id}
              title={task.name}
              summary={`${task.project_name} • ${task.skill_name || 'General'}`}
            >
              <div className="opp-details">
                <p><strong>Project:</strong> {task.project_name}</p>
                <p><strong>Skill Required:</strong> {task.skill_name || 'General'} (Lvl {task.requiredSkillLevel})</p>
                <p><strong>Status:</strong> {task.status}</p>
                <Link to={`/missions/visualizer/${task.project_id}/${task.id}`} className="orbit-btn ghost x-small">View Task Details</Link>
              </div>
            </ExpandablePanel>
          ))
        ) : (
          <p className="empty-state">No matching opportunities found in your immediate vicinity.</p>
        )}
      </div>
    </div>
  );
};

export const QuickActions = () => {
  return (
    <div className="orbit-quick-actions">
      <div className="orbit-section-header">
        <span className="orbit-kicker">COMMAND_ARRAY</span>
        <h3>Quick Actions</h3>
      </div>
      <div className="action-buttons">
        <Link to="/missions/projects" className="action-btn">Open Mission</Link>
        <Link to="/commons/marketplace" className="action-btn">Offer Resource</Link>
        <Link to="/commons/needs" className="action-btn">Ask for Help</Link>
        <Link to="/missions/tasks" className="action-btn">Create Task</Link>
        <Link to="/orbit/focus" className="action-btn">Log Contribution</Link>
      </div>
    </div>
  );
};

export const OrbitHUD = () => {
  const { profile } = useUserProfile();
  const { assignedTasks } = useAssignedTasks(profile?.id);

  const sysStability = useMemo(() => {
    if (!assignedTasks || assignedTasks.length === 0) return '100%';
    const blockedCount = assignedTasks.filter(t => t.status?.toLowerCase() === 'blocked').length;
    const stability = ((assignedTasks.length - blockedCount) / assignedTasks.length) * 100;
    return stability.toFixed(1) + '%';
  }, [assignedTasks]);

  return (
    <div className="orbit-hud-overlay">
      <div className="hud-metric">
        <span className="metric-label">CITIZEN_ID</span>
        <span className="metric-value">#{profile?.id || '---'}</span>
      </div>
      <div className="hud-metric">
        <span className="metric-label">SYS_STABILITY</span>
        <span className="metric-value">{sysStability}</span>
      </div>
      <div className="hud-metric mobile-hide">
        <span className="metric-label">NET_CREDITS</span>
        <span className="metric-value">{profile?.tokens?.toLocaleString() || 0}</span>
      </div>
    </div>
  );
};
