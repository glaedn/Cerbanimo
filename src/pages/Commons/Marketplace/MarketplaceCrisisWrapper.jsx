import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import MarketplacePage from './MarketplacePage';

const MarketplaceCrisisWrapper = () => {
  const [crisisMode, setCrisisMode] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const checkCrisis = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/crisis/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCrisisMode(response.data.enabled);
      } catch (err) {
        console.error('Failed to check crisis status:', err);
      }
    };
    checkCrisis();
  }, [getAccessTokenSilently]);

  return (
    <div className={`marketplace-root ${crisisMode ? 'crisis-active' : ''}`}>
      <MarketplacePage crisisMode={crisisMode} />

      <style>
        {`
          .marketplace-root.crisis-active {
            position: relative;
          }
          .marketplace-root.crisis-active::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 4px solid rgba(255, 50, 50, 0.2);
            pointer-events: none;
            z-index: 1000;
            animation: border-pulse 2s infinite;
          }
          @keyframes border-pulse {
            0% { border-color: rgba(255, 50, 50, 0.1); }
            50% { border-color: rgba(255, 50, 50, 0.4); }
            100% { border-color: rgba(255, 50, 50, 0.1); }
          }
        `}
      </style>
    </div>
  );
};

export default MarketplaceCrisisWrapper;
