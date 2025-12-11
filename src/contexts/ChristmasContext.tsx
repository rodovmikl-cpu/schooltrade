import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ChristmasContextType {
  isChristmasActive: boolean;
  isChristmasBackgroundOnly: boolean;
  daysUntilChristmas: number;
  currentDay: number;
}

const ChristmasContext = createContext<ChristmasContextType>({
  isChristmasActive: false,
  isChristmasBackgroundOnly: false,
  daysUntilChristmas: 0,
  currentDay: 0,
});

export const useChristmas = () => useContext(ChristmasContext);

export const ChristmasProvider = ({ children }: { children: ReactNode }) => {
  const [isChristmasActive, setIsChristmasActive] = useState(false);
  const [isChristmasBackgroundOnly, setIsChristmasBackgroundOnly] = useState(false);
  const [daysUntilChristmas, setDaysUntilChristmas] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);

  useEffect(() => {
    const checkChristmasStatus = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed, December = 11
      const day = now.getDate();

      // Christmas day
      const christmas = new Date(year, 11, 25);
      const diffTime = christmas.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysUntilChristmas(Math.max(0, diffDays));

      // Full Christmas event: Dec 1 - Dec 25
      if (month === 11 && day >= 1 && day <= 25) {
        setIsChristmasActive(true);
        setIsChristmasBackgroundOnly(false);
        setCurrentDay(day);
      }
      // Background only: Dec 26 - Jan 1
      else if ((month === 11 && day >= 26) || (month === 0 && day === 1)) {
        setIsChristmasActive(false);
        setIsChristmasBackgroundOnly(true);
        setCurrentDay(day);
      }
      // Reset everything after Jan 1
      else {
        setIsChristmasActive(false);
        setIsChristmasBackgroundOnly(false);
        setCurrentDay(0);
      }
    };

    checkChristmasStatus();
    const interval = setInterval(checkChristmasStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <ChristmasContext.Provider value={{ isChristmasActive, isChristmasBackgroundOnly, daysUntilChristmas, currentDay }}>
      {children}
    </ChristmasContext.Provider>
  );
};
