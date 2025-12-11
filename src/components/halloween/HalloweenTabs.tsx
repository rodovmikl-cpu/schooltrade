import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HalloweenQuests } from './HalloweenQuests';
import { PumpkinNight } from './games/PumpkinNight';
import { HauntedCountry } from './games/HauntedCountry';
import { DoorFinder } from './games/DoorFinder';
import { GhostHunter } from './games/GhostHunter';
import { SpiderCatcher } from './games/SpiderCatcher';

export const HalloweenTabs = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Tabs defaultValue="quests" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 bg-orange-500/20 border border-orange-500/50">
          <TabsTrigger value="quests" className="data-[state=active]:bg-orange-500/40">
            🎯 קוואסטים
          </TabsTrigger>
          <TabsTrigger value="games" className="data-[state=active]:bg-orange-500/40">
            🎮 משחקים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quests" className="space-y-6 mt-6">
          <HalloweenQuests />
        </TabsContent>

        <TabsContent value="games" className="space-y-6 mt-6">
          <Tabs defaultValue="pumpkin-night" dir="rtl">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pumpkin-night">🎃 ליל דלעות</TabsTrigger>
              <TabsTrigger value="haunted-country">🏫 מדינת הרפל</TabsTrigger>
              <TabsTrigger value="door-finder">🚪 מצא את הדלת</TabsTrigger>
              <TabsTrigger value="ghost-hunter">👻 מרדף הרוחות</TabsTrigger>
              <TabsTrigger value="spider-catcher">🕷️ לכידת העכבישים</TabsTrigger>
            </TabsList>

            <TabsContent value="pumpkin-night" className="mt-4">
              <PumpkinNight />
            </TabsContent>
            <TabsContent value="haunted-country" className="mt-4">
              <HauntedCountry />
            </TabsContent>
            <TabsContent value="door-finder" className="mt-4">
              <DoorFinder />
            </TabsContent>
            <TabsContent value="ghost-hunter" className="mt-4">
              <GhostHunter />
            </TabsContent>
            <TabsContent value="spider-catcher" className="mt-4">
              <SpiderCatcher />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};
