import React, { createContext, useContext, useState, useEffect } from 'react';

const CrisisContext = createContext();

export const useCrisis = () => {
  const context = useContext(CrisisContext);
  if (!context) {
    throw new Error('useCrisis must be used within a CrisisProvider');
  }
  return context;
};

export const CrisisProvider = ({ children }) => {
  const [isCrisisMode, setIsCrisisMode] = useState(() => {
    const saved = localStorage.getItem('crisisMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('crisisMode', isCrisisMode);
  }, [isCrisisMode]);

  const toggleCrisisMode = () => setIsCrisisMode(prev => !prev);

  return (
    <CrisisContext.Provider value={{ isCrisisMode, toggleCrisisMode, setIsCrisisMode }}>
      {children}
    </CrisisContext.Provider>
  );
};
