import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export function useIntelligence(options = {}) {
  const {
    pollInterval = 30000,
    quietMode = false,
    focusMode = false
  } = options;

  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPulse = useCallback(async () => {
    try {
      if (!isAuthenticated) return;

      const token = await getAccessTokenSilently({
        audience: BACKEND_URL,
      });

      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/intelligence/pulse`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let filteredSignals = response.data.signals || [];

      // Apply User Preference Filtering
      if (focusMode) {
        // Only show friction and crisis in Focus Mode
        filteredSignals = filteredSignals.filter(s =>
          s.type === 'friction' || s.type === 'crisis' || s.priority === 'critical'
        );
      } else if (quietMode) {
        // Only show high priority signals in Quiet Mode
        filteredSignals = filteredSignals.filter(s =>
          s.priority === 'high' || s.priority === 'critical'
        );
      }

      setPulse({
        ...response.data,
        signals: filteredSignals
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching intelligence pulse:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [quietMode, focusMode, getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPulse, pollInterval]);

  return { pulse, loading, error, refresh: fetchPulse };
}
