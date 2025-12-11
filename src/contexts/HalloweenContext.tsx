import React, { createContext, useContext, useState, useEffect } from 'react';

interface HalloweenContextType {
  isHalloweenActive: boolean;
  isCountdownActive: boolean;
  timeUntilHalloween: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null;
}

const HalloweenContext = createContext<HalloweenContextType | undefined>(undefined);

export const useHalloween = () => {
  const context = useContext(HalloweenContext);
  if (!context) throw new Error('useHalloween must be used within HalloweenProvider');
  return context;
};

export const HalloweenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHalloweenActive, setIsHalloweenActive] = useState(false);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [timeUntilHalloween, setTimeUntilHalloween] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const checkHalloweenStatus = () => {
      const now = new Date();
      const halloweenStart = new Date(now.getFullYear(), 9, 31, 0, 1); // Oct 31, 00:01
      const halloweenEnd = new Date(now.getFullYear(), 10, 1, 0, 1); // Nov 1, 00:01

      // If we're past Halloween this year, check next year
      if (now > halloweenEnd) {
        halloweenStart.setFullYear(now.getFullYear() + 1);
        halloweenEnd.setFullYear(now.getFullYear() + 1);
      }

      const isActive = now >= halloweenStart && now < halloweenEnd;
      const showCountdown = now < halloweenStart;

      setIsHalloweenActive(isActive);
      setIsCountdownActive(showCountdown);

      // Calculate time until Halloween
      if (showCountdown) {
        const diff = halloweenStart.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeUntilHalloween({ days, hours, minutes, seconds });
      } else {
        setTimeUntilHalloween(null);
      }
    };

    checkHalloweenStatus();
    const interval = setInterval(checkHalloweenStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <HalloweenContext.Provider
      value={{
        isHalloweenActive,
        isCountdownActive,
        timeUntilHalloween,
      }}
    >
      {children}
    </HalloweenContext.Provider>
  );
};
