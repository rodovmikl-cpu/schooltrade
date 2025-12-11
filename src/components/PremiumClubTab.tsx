import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TetrisGame } from "@/components/TetrisGame";
import { SecretSection } from "@/components/SecretSection";
import { PrivateChats } from "@/components/PrivateChats";

interface PremiumClubTabProps {
  userCode: string;
  userName: string;
}

export const PremiumClubTab = ({ userCode, userName }: PremiumClubTabProps) => {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-[#00C853] mb-2">🌟 חבר מועדון 🌟</h2>
        <p className="text-muted-foreground">ברוך הבא לאזור הבלעדי!</p>
      </div>

      <Tabs defaultValue="tetris" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#00C853]/20">
          <TabsTrigger value="tetris" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            🎮 טטריס
          </TabsTrigger>
          <TabsTrigger value="chats" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            💬 צ'אטים
          </TabsTrigger>
          <TabsTrigger value="secret" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            🔒 אזור סודי
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tetris" className="mt-6">
          <TetrisGame />
        </TabsContent>
        
        <TabsContent value="chats" className="mt-6">
          <PrivateChats userCode={userCode} userName={userName} />
        </TabsContent>
        
        <TabsContent value="secret" className="mt-6">
          <SecretSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
