import { useState } from "react";
import { KeifConverter } from "./KeifConverter";
import { KeifLeaderboard } from "./KeifLeaderboard";
import { playSound } from "@/lib/sounds";

interface KeifTabProps {
  userCode: string;
  userName: string;
}

export const KeifTab = ({ userCode, userName }: KeifTabProps) => {
  const [subTab, setSubTab] = useState<"convert" | "leaderboard">("convert");

  const switchTab = (tab: "convert" | "leaderboard") => {
    playSound("tab");
    setSubTab(tab);
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => switchTab("convert")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
            subTab === "convert"
              ? "bg-background text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🪙 החלף לקיפים
        </button>
        <button
          onClick={() => switchTab("leaderboard")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
            subTab === "leaderboard"
              ? "bg-background text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🏆 טבלת מובילים
        </button>
      </div>

      {/* Tab content with fade transition */}
      <div
        key={subTab}
        className="animate-[fadeSlideIn_0.3s_ease-out]"
        style={{ animation: "fadeSlideIn 0.3s ease-out" }}
      >
        {subTab === "convert" ? (
          <KeifConverter userCode={userCode} userName={userName} />
        ) : (
          <KeifLeaderboard userCode={userCode} />
        )}
      </div>
    </div>
  );
};
