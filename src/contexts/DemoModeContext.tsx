import React, { createContext, useContext, ReactNode } from 'react';

interface DemoModeContextType {
  isReadOnlyDemo: boolean;
  isDemoMode: boolean;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Read environment variables for demo modes
  const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <DemoModeContext.Provider value={{ isReadOnlyDemo, isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};