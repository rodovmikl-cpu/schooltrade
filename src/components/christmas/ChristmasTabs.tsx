import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdventCalendar } from "./AdventCalendar";
import { SkinsCollection } from "./SkinsCollection";
import { ChristmasGame } from "./ChristmasGame";

export const ChristmasTabs = () => {
  const [isGameAvailable, setIsGameAvailable] = useState(false);

  useEffect(() => {
    const checkGameAvailability = () => {
      const now = new Date();
      const month = now.getMonth(); // 0-indexed, December = 11
      const day = now.getDate();
      
      // Game available Dec 25-30
      if (month === 11 && day >= 25 && day <= 30) {
        setIsGameAvailable(true);
      } else {
        setIsGameAvailable(false);
      }
    };

    checkGameAvailability();
    const interval = setInterval(checkGameAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className={`grid w-full ${isGameAvailable ? "grid-cols-3" : "grid-cols-2"} bg-red-900/30`}>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-red-600">
            🎄 לוח חג המולד
          </TabsTrigger>
          <TabsTrigger value="collection" className="data-[state=active]:bg-green-600">
            🎨 אוסף סקינים
          </TabsTrigger>
          {isGameAvailable && (
            <TabsTrigger value="game" className="data-[state=active]:bg-blue-600">
              🎮 משחק חג
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <AdventCalendar />
        </TabsContent>
        
        <TabsContent value="collection" className="mt-6">
          <SkinsCollection />
        </TabsContent>

        {isGameAvailable && (
          <TabsContent value="game" className="mt-6">
            <ChristmasGame />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
