import React, { createContext, useContext, useState, useEffect } from 'react';

const LoFiContext = createContext();

export const useLoFi = () => {
  const context = useContext(LoFiContext);
  if (!context) {
    throw new Error('useLoFi must be used within a LoFiProvider');
  }
  return context;
};

export const LoFiProvider = ({ children }) => {
  const [isLoFiMode, setIsLoFiMode] = useState(() => {
    const saved = localStorage.getItem('loFiMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('loFiMode', isLoFiMode);
  }, [isLoFiMode]);

  const toggleLoFiMode = () => setIsLoFiMode(prev => !prev);

  return (
    <LoFiContext.Provider value={{ isLoFiMode, toggleLoFiMode, setIsLoFiMode }}>
      {children}
    </LoFiContext.Provider>
  );
};
