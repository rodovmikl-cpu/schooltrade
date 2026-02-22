import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DailyQuest,
  DailyEvent,
  getDailyQuests,
  getDailyEvent,
  getQuestProgress,
  getTimeUntilReset,
} from "@/lib/dailyQuests";
import { playPremiumSound } from "@/lib/premiumSounds";

interface DailyQuestPanelProps {
  gameKey: string;
}

export const DailyQuestPanel = ({ gameKey }: DailyQuestPanelProps) => {
  const [quests] = useState<DailyQuest[]>(() => getDailyQuests(gameKey));
  const [event] = useState<DailyEvent>(() => getDailyEvent());
  const [timer, setTimer] = useState(getTimeUntilReset());
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(getTimeUntilReset());
      const newProgress: Record<string, number> = {};
      quests.forEach(q => { newProgress[q.id] = getQuestProgress(gameKey, q.id); });
      setProgress(newProgress);
    }, 1000);
    return () => clearInterval(interval);
  }, [quests, gameKey]);

  useEffect(() => {
    const newProgress: Record<string, number> = {};
    quests.forEach(q => { newProgress[q.id] = getQuestProgress(gameKey, q.id); });
    setProgress(newProgress);
  }, [quests, gameKey]);

  return (
    <div className="space-y-3 mb-4" dir="rtl">
      {/* Daily Event */}
      <div className="p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-bold">{event.emoji} {event.title}</span>
            <p className="text-xs text-muted-foreground">{event.description}</p>
          </div>
          <div className="text-left">
            <Badge className="bg-primary/20 text-primary">×{event.bonusMultiplier.toFixed(1)}</Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {String(timer.hours).padStart(2, "0")}:{String(timer.minutes).padStart(2, "0")}:{String(timer.seconds).padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Quests */}
      <div className="space-y-2">
        <p className="text-sm font-bold text-muted-foreground">📋 משימות יומיות</p>
        {quests.map((quest) => {
          const prog = progress[quest.id] || 0;
          const pct = Math.min(100, (prog / quest.target) * 100);
          const done = prog >= quest.target;
          return (
            <div
              key={quest.id}
              className={`p-2.5 rounded-lg border transition-all ${
                done ? "border-green-500/40 bg-green-500/5" : "border-border bg-card/50"
              }`}
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">
                  {quest.emoji} {quest.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {done ? "✅" : `${prog}/${quest.target}`} | +{quest.reward} נק'
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
