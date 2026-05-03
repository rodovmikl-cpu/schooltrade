import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaderboard } from "@/components/games/Leaderboard";

interface Props {
  gameKey: string;
  userCode: string;
  title: string;
  children: ReactNode;
}

export const GameWithLeaderboard = ({ gameKey, userCode, title, children }: Props) => {
  return (
    <div dir="rtl" className="space-y-4">
      <h2 className="text-2xl font-bold text-center">{title}</h2>
      <Tabs defaultValue="play" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="play">🎮 משחק</TabsTrigger>
          <TabsTrigger value="board">🏆 טבלת מובילים</TabsTrigger>
        </TabsList>
        <TabsContent value="play" className="mt-4 animate-fade-in">
          {children}
        </TabsContent>
        <TabsContent value="board" className="mt-4 animate-fade-in">
          <Leaderboard gameKey={gameKey} currentUserCode={userCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
