import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TetrisGame } from "@/components/TetrisGame";
import { SecretSection } from "@/components/SecretSection";
import { PrivateChats } from "@/components/PrivateChats";
import { CryptoEmpire } from "@/components/premium/games/CryptoEmpire";
import { MindArena } from "@/components/premium/games/MindArena";
import { ShadowMissions } from "@/components/premium/games/ShadowMissions";
import { DigitalDrift } from "@/components/premium/games/DigitalDrift";
import { VIPSurvival } from "@/components/premium/games/VIPSurvival";
import { SchooltradeBot } from "@/components/premium/SchooltradeBot";
import { playSound } from "@/lib/sounds";

interface PremiumClubTabProps {
  userCode: string;
  userName: string;
}

export const PremiumClubTab = ({ userCode, userName }: PremiumClubTabProps) => {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const PREMIUM_GAMES = [
    { key: "cryptoEmpire", label: "💎 אימפריית הקריפטו", desc: "שוק סודי, NFT נדירים, מכירות פומביות", color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/40" },
    { key: "mindArena", label: "🧠 אליפות המוחות", desc: "חידות עילית, קודים סודיים, לוגיקה", color: "from-purple-500/20 to-violet-500/10 border-purple-500/40" },
    { key: "shadowMissions", label: "🕶️ משימות צללים", desc: "תפקידים, פריצות, בגידות", color: "from-cyan-500/20 to-sky-500/10 border-cyan-500/40" },
    { key: "digitalDrift", label: "🏁 זירת הדריפט", desc: "שדרוגי רכב, מרוצים, טורנירים", color: "from-orange-500/20 to-red-500/10 border-orange-500/40" },
    { key: "vipSurvival", label: "⚔️ אתגר ההישרדות", desc: "זירת PvE, לוט, כישורים מיוחדים", color: "from-red-500/20 to-rose-500/10 border-red-500/40" },
  ];

  const renderGame = () => {
    switch (activeGame) {
      case "cryptoEmpire": return <CryptoEmpire />;
      case "mindArena": return <MindArena />;
      case "shadowMissions": return <ShadowMissions />;
      case "digitalDrift": return <DigitalDrift />;
      case "vipSurvival": return <VIPSurvival />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-[#00C853] mb-2 premium-text-glow">🌟 חבר מועדון 🌟</h2>
        <p className="text-muted-foreground">ברוך הבא לאזור הבלעדי!</p>
      </div>

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#00C853]/20">
          <TabsTrigger value="games" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            🎮 משחקים
          </TabsTrigger>
          <TabsTrigger value="bot" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            🤖 בוט
          </TabsTrigger>
          <TabsTrigger value="chats" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            💬 צ'אטים
          </TabsTrigger>
          <TabsTrigger value="secret" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-white">
            🔒 סודי
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="games" className="mt-6">
          {activeGame ? (
            <div className="space-y-4">
              <button
                onClick={() => { playSound("tab"); setActiveGame(null); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                חזרה לרשימת המשחקים
              </button>
              <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                {renderGame()}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PREMIUM_GAMES.map((game, idx) => (
                  <button
                    key={game.key}
                    onClick={() => { playSound("enter"); setActiveGame(game.key); }}
                    className={`text-right p-5 rounded-2xl border-2 bg-gradient-to-br ${game.color} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
                    style={{ animationDelay: `${idx * 50}ms`, animation: "fadeSlideIn 0.3s ease-out" }}
                  >
                    <div className="text-2xl mb-2">{game.label.split(" ")[0]}</div>
                    <div className="font-semibold text-base">{game.label.slice(game.label.indexOf(" ") + 1)}</div>
                    <div className="text-sm text-muted-foreground mt-1">{game.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <TetrisGame />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="bot" className="mt-6">
          <SchooltradeBot />
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
