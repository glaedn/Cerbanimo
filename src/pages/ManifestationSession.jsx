import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import IntentionLotusMap from './IntentionLotusMap';
import './ManifestationSession.css';

const ManifestationSession = () => {
  const { state } = useLocation();
  const { getAccessTokenSilently } = useAuth0();
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState(1800); // 30 minutes in seconds
  const [summary, setSummary] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      if (state?.sessionId) {
        try {
          const token = await getAccessTokenSilently();
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${state.sessionId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setSession(response.data);
        } catch (error) {
          console.error('Error fetching session:', error);
        }
      }
    };

    fetchSession();
  }, [state, getAccessTokenSilently]);

  useEffect(() => {
    if (session && session.status === 'active' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      handleEndSession();
    }
  }, [session, timer]);

  const handleEndSession = async () => {
    if (!session) return;
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${session.id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSummary(response.data.manifestation_summary);
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (!session) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="manifestation-session-container">
      <h1>🌠 GROUP MANIFESTATION 🌠</h1>
      <div className="session-stats">
        <span>Timer: {formatTime(timer)}</span>
        <span>Participants: {session.participants?.length || 0}</span>
        <span>Active Resonances: {session.resonance_events?.length || 0}</span>
      </div>
      <div className="live-constellation">
        <IntentionLotusMap intentionId={session.intention_id} isManifestView={true} />
      </div>
      {summary && (
        <div className="summary-overlay">
          <h2>Manifestation Summary</h2>
          <p>{summary}</p>
        </div>
      )}
      <div className="session-controls">
        <button onClick={handleEndSession} disabled={session.status === 'completed'}>
          [ END SESSION ]
        </button>
      </div>
    </div>
  );
};

export default ManifestationSession;