import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface LeaderboardProps {
  gameKey: string;
  currentUserCode?: string;
  limit?: number;
}

interface ScoreRow {
  id: string;
  user_code: string;
  user_name: string;
  score: number;
  created_at: string;
}

export const Leaderboard = ({ gameKey, currentUserCode, limit = 20 }: LeaderboardProps) => {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*")
      .eq("game_key", gameKey)
      .order("score", { ascending: false })
      .limit(limit);
    setScores((data as ScoreRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`gs-${gameKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_scores", filter: `game_key=eq.${gameKey}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  // Best per user
  const bestByUser = new Map<string, ScoreRow>();
  for (const s of scores) {
    const cur = bestByUser.get(s.user_code);
    if (!cur || s.score > cur.score) bestByUser.set(s.user_code, s);
  }
  const ranked = Array.from(bestByUser.values()).sort((a, b) => b.score - a.score).slice(0, limit);

  return (
    <Card className="p-4" dir="rtl">
      <h3 className="text-lg font-bold mb-3 text-center">🏆 טבלת מובילים</h3>
      {loading ? (
        <div className="text-center text-muted-foreground py-4">טוען...</div>
      ) : ranked.length === 0 ? (
        <div className="text-center text-muted-foreground py-4">אין עדיין שיאים — היה הראשון!</div>
      ) : (
        <ol className="space-y-1">
          {ranked.map((s, i) => {
            const isMe = s.user_code === currentUserCode;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            return (
              <li key={s.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                  isMe ? "bg-primary/15 border border-primary/40" : "bg-muted/30"
                }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-8">{medal}</span>
                  <span className="font-medium">{s.user_name}</span>
                  {isMe && <span className="text-xs text-primary">(אתה)</span>}
                </div>
                <span className="font-bold tabular-nums">{s.score.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};

export const submitScore = async (gameKey: string, userCode: string, userName: string, score: number) => {
  if (!userCode || !userName || score <= 0) return;
  try {
    await supabase.from("game_scores").insert({ game_key: gameKey, user_code: userCode, user_name: userName, score: Math.floor(score) });
  } catch (e) {
    console.error("submitScore error", e);
  }
};
