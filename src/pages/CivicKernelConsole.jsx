import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './CivicKernelConsole.css';

const emptyOverview = {
  totals: { events: 0, nodes: 0, relationships: 0, activeIntents: 0 },
  eventCounts: [],
  nodeCounts: [],
  relationshipCounts: [],
  intentCounts: [],
  recentEvents: [],
  activeIntents: [],
  urgentNeeds: [],
  missionLinks: [],
  agentSignals: []
};

const formatLabel = (value = '') => value.replace(/[_-]/g, ' ');

const formatDate = (value) => {
  if (!value) return 'time unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
};

const BarList = ({ rows, labelKey, valueKey = 'count' }) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);

  if (!rows.length) {
    return <div className="kernel-empty">No signal recorded yet.</div>;
  }

  return (
    <div className="kernel-bars">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <div className="kernel-bar-row" key={`${row[labelKey]}-${value}`}>
            <span>{formatLabel(row[labelKey])}</span>
            <div className="kernel-bar-track">
              <div className="kernel-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <strong>{value}</strong>
          </div>
        );
      })}
    </div>
  );
};

const CivicKernelConsole = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const fetchOverview = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/civic-kernel/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error(`Kernel overview request failed with ${res.status}`);
        }

        const json = await res.json();
        if (alive) {
          setOverview({ ...emptyOverview, ...json });
          setError('');
        }
      } catch (err) {
        console.error('Failed to fetch civic kernel overview:', err);
        if (alive) setError('Civic kernel telemetry is unavailable.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchOverview();
    const interval = window.setInterval(fetchOverview, 30000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [getAccessTokenSilently]);

  const totals = overview.totals || emptyOverview.totals;
  const eventRows = overview.eventCounts || [];
  const nodeRows = overview.nodeCounts || [];
  const relationshipRows = overview.relationshipCounts || [];

  const highestPriority = useMemo(() => {
    const priorities = (overview.activeIntents || []).map((intent) => Number(intent.priority_score) || 0);
    return priorities.length ? Math.max(...priorities) : 0;
  }, [overview.activeIntents]);

  return (
    <main className="civic-kernel">
      <div className="kernel-shell">
        <header className="kernel-header">
          <div>
            <p className="kernel-kicker">Cerbanimo 2.0 kernel</p>
            <h1 className="kernel-title">Civic Nervous System</h1>
            <p className="kernel-subtitle">
              Intent, event, and graph telemetry from the living coordination layer.
            </p>
          </div>
          <div className="kernel-status">{loading ? 'SYNCING...' : 'READ MODEL ACTIVE'}</div>
        </header>

        {error && <div className="kernel-error">{error}</div>}

        <section className="kernel-stats" aria-label="Civic kernel totals">
          <div className="kernel-stat">
            <span className="kernel-label">Events</span>
            <strong className="kernel-value">{totals.events}</strong>
          </div>
          <div className="kernel-stat">
            <span className="kernel-label">World Nodes</span>
            <strong className="kernel-value">{totals.nodes}</strong>
          </div>
          <div className="kernel-stat">
            <span className="kernel-label">Relations</span>
            <strong className="kernel-value">{totals.relationships}</strong>
          </div>
          <div className="kernel-stat">
            <span className="kernel-label">Max Priority</span>
            <strong className="kernel-value">{Math.round(highestPriority)}</strong>
          </div>
        </section>

        <section className="kernel-grid">
          <div className="kernel-column">
            <div className="kernel-panel">
              <h2 className="kernel-section-title">Coordination Agents</h2>
              <div className="kernel-list">
                {(overview.agentSignals || []).length ? overview.agentSignals.map((signal) => (
                  <article className="kernel-item" key={`${signal.agent}-${signal.subjectType}-${signal.subjectId}`}>
                    <div className="kernel-item-top">
                      <p className="kernel-item-title">{signal.title}</p>
                      <span className={`kernel-pill ${signal.severity >= 70 ? 'hot' : ''}`}>{signal.agent}</span>
                    </div>
                    <div className="kernel-meta">
                      severity {signal.severity} / {formatLabel(signal.subjectType)} #{signal.subjectId} / {signal.signal}
                    </div>
                    <div className="kernel-recommendation">{signal.recommendation}</div>
                  </article>
                )) : <div className="kernel-empty">No agent signals yet.</div>}
              </div>
            </div>

            <div className="kernel-panel">
              <h2 className="kernel-section-title">Intent Queue</h2>
              <div className="kernel-list">
                {(overview.activeIntents || []).length ? overview.activeIntents.map((intent) => (
                  <article className="kernel-item" key={intent.id}>
                    <div className="kernel-item-top">
                      <p className="kernel-item-title">{intent.title}</p>
                      <span className="kernel-pill hot">{Math.round(Number(intent.priority_score) || 0)}</span>
                    </div>
                    <div className="kernel-meta">
                      {formatLabel(intent.intent_type)} / {formatLabel(intent.status)} / {formatDate(intent.created_at)}
                    </div>
                  </article>
                )) : <div className="kernel-empty">No active intents yet.</div>}
              </div>
            </div>

            <div className="kernel-panel">
              <h2 className="kernel-section-title">Urgent Needs</h2>
              <div className="kernel-list">
                {(overview.urgentNeeds || []).length ? overview.urgentNeeds.map((need) => (
                  <article className="kernel-item" key={need.id}>
                    <div className="kernel-item-top">
                      <p className="kernel-item-title">{need.name}</p>
                      <span className="kernel-pill">{need.urgency_level || need.urgency || 'medium'}</span>
                    </div>
                    <div className="kernel-meta">
                      {need.category || 'Coordination'} / complexity {Number(need.complexity_score || 0).toFixed(1)} / {formatLabel(need.status)}
                    </div>
                  </article>
                )) : <div className="kernel-empty">No urgent open needs found.</div>}
              </div>
            </div>

            <div className="kernel-panel">
              <h2 className="kernel-section-title">Mission Links</h2>
              <div className="kernel-list">
                {(overview.missionLinks || []).length ? overview.missionLinks.map((link) => (
                  <article className="kernel-item" key={link.id}>
                    <p className="kernel-item-title">{link.source_label} {'->'} {link.target_label}</p>
                    <div className="kernel-meta">
                      {formatLabel(link.source_type)} {formatLabel(link.relationship_type)} {formatLabel(link.target_type)} / {formatDate(link.created_at)}
                    </div>
                  </article>
                )) : <div className="kernel-empty">No mission graph links recorded yet.</div>}
              </div>
            </div>
          </div>

          <aside className="kernel-column">
            <div className="kernel-panel">
              <h2 className="kernel-section-title">Event Types</h2>
              <BarList rows={eventRows} labelKey="event_type" />
            </div>
            <div className="kernel-panel">
              <h2 className="kernel-section-title">World Composition</h2>
              <BarList rows={nodeRows} labelKey="node_type" />
            </div>
            <div className="kernel-panel">
              <h2 className="kernel-section-title">Relationships</h2>
              <BarList rows={relationshipRows} labelKey="relationship_type" />
            </div>
            <div className="kernel-panel">
              <h2 className="kernel-section-title">Recent Events</h2>
              <div className="kernel-list">
                {(overview.recentEvents || []).length ? overview.recentEvents.map((event) => (
                  <article className="kernel-event" key={event.id}>
                    <span className="kernel-dot" />
                    <div>
                      <p className="kernel-item-title">{formatLabel(event.event_type)}</p>
                      <div className="kernel-meta">
                        {formatLabel(event.subject_type)} #{event.subject_id || 'n/a'} / {formatDate(event.created_at)}
                      </div>
                    </div>
                  </article>
                )) : <div className="kernel-empty">No recent events.</div>}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default CivicKernelConsole;
