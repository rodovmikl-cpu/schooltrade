import { useState } from "react";
import { CryptoGame } from "@/components/games/CryptoGame";
import { MathGame } from "@/components/games/MathGame";
import { HebrewGame } from "@/components/games/HebrewGame";
import { EnglishGame } from "@/components/games/EnglishGame";

import { CountryFlagGame } from "@/components/games/CountryFlagGame";
import { SnakeGame } from "@/components/SnakeGame";
import { PremiumGameBadge } from "@/components/premium/PremiumGameBadge";
import { isPremiumUser } from "@/lib/premium";
import { playSound } from "@/lib/sounds";

interface GamesHubProps {
  userCode: string;
  userName: string;
}

type GameKey = "menu" | "snake" | "crypto" | "math" | "hebrew" | "english" | "flags";

const GAMES = [
  { key: "snake" as GameKey, label: "🐍 משחק הנחש", desc: "אסוף אוכל והתחמק מהקירות", color: "from-green-500/20 to-emerald-500/10 border-green-500/40 hover:border-green-400/70" },
  { key: "crypto" as GameKey, label: "💰 קריפטו-גיים", desc: "סחר במטבעות קריפטו וצבור עושר", color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/40 hover:border-yellow-400/70" },
  { key: "math" as GameKey, label: "🧮 מישחק מתמטי", desc: "25 שאלות מותאמות לרמת הכיתה שלך", color: "from-blue-500/20 to-indigo-500/10 border-blue-500/40 hover:border-blue-400/70" },
  { key: "hebrew" as GameKey, label: "📚 מישחק עברית", desc: "קרא סיפורים וענה על שאלות הבנה", color: "from-purple-500/20 to-violet-500/10 border-purple-500/40 hover:border-purple-400/70" },
  { key: "english" as GameKey, label: "🇬🇧 מישחק אנגלית", desc: "Read stories and answer comprehension questions", color: "from-cyan-500/20 to-sky-500/10 border-cyan-500/40 hover:border-cyan-400/70" },
  { key: "flags" as GameKey, label: "🌍 מישחק המדינות", desc: "זהה דגלים ובחר את המדינה הנכונה", color: "from-teal-500/20 to-emerald-500/10 border-teal-500/40 hover:border-teal-400/70" },
  
];

export const GamesHub = ({ userCode, userName }: GamesHubProps) => {
  const [activeGame, setActiveGame] = useState<GameKey>("menu");
  const isPremium = isPremiumUser(userCode);

  const openGame = (key: GameKey) => {
    playSound("enter");
    setActiveGame(key);
  };

  const goBack = () => {
    playSound("tab");
    setActiveGame("menu");
  };

  if (activeGame !== "menu") {
    return (
      <div className="space-y-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
          חזרה לרשימת המשחקים
        </button>
        <PremiumGameBadge userCode={userCode} />
        <div className="animate-[fadeSlideIn_0.3s_ease-out]">
          {activeGame === "snake" && <SnakeGame />}
          {activeGame === "crypto" && <CryptoGame userCode={userCode} />}
          {activeGame === "math" && <MathGame />}
          {activeGame === "hebrew" && <HebrewGame />}
          {activeGame === "english" && <EnglishGame />}
          
          {activeGame === "flags" && <CountryFlagGame />}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">🎮 משחקים</h2>
        <p className="text-muted-foreground mt-1">בחר משחק להתחיל</p>
        {isPremium && (
          <p className="text-[#00C853] text-sm font-bold mt-1 premium-text-glow">👑 חבר מועדון — ×2 תגמול בכל המשחקים!</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game, idx) => (
          <button
            key={game.key}
            onClick={() => openGame(game.key)}
            className={`text-right p-5 rounded-2xl border-2 bg-gradient-to-br ${game.color} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="text-2xl mb-2">{game.label.split(" ")[0]}</div>
            <div className="font-semibold text-base">{game.label.slice(game.label.indexOf(" ") + 1)}</div>
            <div className="text-sm text-muted-foreground mt-1">{game.desc}</div>
            <div className="mt-3 text-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              לחץ לכניסה ←
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
