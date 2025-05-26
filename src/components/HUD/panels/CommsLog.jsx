import React, { useState, useEffect } from 'react';
import '../HUDPanel.css'; // Shared panel styles
// import './CommsLog.css'; // Optional: For specific CommsLog styles if needed

const sampleActivities = [
  "Selena approved Sable Vale's task, 'Setup 2-D Collision Detection'",
  "User 'NovaSpark' completed the 'Optimize Shield Harmonics' challenge.",
  "New project 'Project Chimera' has been initiated by 'Admin'.",
  "'Raptor7' joined the 'Galactic Cartography' community.",
  "Automated System: Database backup completed successfully.",
  "User 'StarLord' just reached Level 5 in Piloting.",
  "Community 'Cosmic Engineers' published a new resource: 'Advanced Warp Drive schematics'.",
  "Task 'Deploy Navigation Beacons' is nearing its deadline.",
  "User 'CyberWrench' submitted proof for 'Refactor Legacy Comms Array'.",
  "Security Alert: Unusual login attempt detected from Sector Gamma-7."
];

const CommsLog = () => {
  const [activityLog, setActivityLog] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (e) => {
    // Prevent click event from bubbling up if the button itself was clicked
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  useEffect(() => {
    // Add initial activities without waiting for the first interval
    const initialActivities = [];
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * sampleActivities.length);
        // Ensure no duplicates in initial load if possible, or just pick random
        initialActivities.unshift(sampleActivities[randomIndex]); 
    }
    setActivityLog(initialActivities.slice(0,3));


    const intervalId = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * sampleActivities.length);
      const newActivity = sampleActivities[randomIndex];
      
      setActivityLog(prevLog => {
        // Prevent adding the exact same message consecutively
        if (prevLog.length > 0 && prevLog[0] === newActivity) {
          return prevLog;
        }
        const updatedLog = [newActivity, ...prevLog];
        return updatedLog.slice(0, 3); // Keep only the latest 3
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className={`hud-panel comms-log ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Comms Log</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Comms Log" : "Minimize Comms Log"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {activityLog.length > 0 ? (
            <ul>
              {activityLog.map((activity, index) => (
                <li key={index} className="activity-item"> {/* Using 'activity-item' for potential styling */}
                  {activity}
                </li>
              ))}
            </ul>
          ) : (
            <p>Initializing activity feed...</p> 
          )}
        </div>
      )}
    </div>
  );
};

export default CommsLog;
