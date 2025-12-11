import { useState, useEffect } from "react";
import originalLogo from "@/assets/schooltrade-logo.jpg";
import tempChristmasLogo from "@/assets/temp-christmas-logo.png";

export const useTemporaryLogo = () => {
  const [currentLogo, setCurrentLogo] = useState(originalLogo);

  useEffect(() => {
    const checkLogoStatus = () => {
      const now = new Date();
      const year = now.getFullYear();
      
      // Temporary logo active until January 2 at 23:59
      const tempLogoEndDate = new Date(year, 0, 2, 23, 59, 59); // January 2
      
      // If we're past January 2 of the current year but before December,
      // we need to check if we should show the temp logo for next year's period
      const decemberStart = new Date(year, 11, 1); // December 1
      
      // Check if temp logo should be active
      // Active from whenever it was set until January 2 at 23:59
      const isBeforeJanuary3 = now < tempLogoEndDate || now.getMonth() >= 11;
      
      // Simple logic: show temp logo from now until January 2, 23:59
      // On January 3+, revert to original
      if (now.getMonth() === 0) {
        // January
        if (now.getDate() <= 2) {
          // January 1-2: show temp logo
          setCurrentLogo(tempChristmasLogo);
        } else {
          // January 3+: show original
          setCurrentLogo(originalLogo);
        }
      } else if (now.getMonth() === 11) {
        // December: show temp logo
        setCurrentLogo(tempChristmasLogo);
      } else {
        // February-November: show original
        setCurrentLogo(originalLogo);
      }
    };

    checkLogoStatus();
    
    // Check every minute for date changes
    const interval = setInterval(checkLogoStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return currentLogo;
};
