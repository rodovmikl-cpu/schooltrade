import { useEffect, useRef, useState } from "react";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest, getArcadeBest } from "@/lib/arcadePoints";

interface Props {
  userCode: string;
  userName: string;
}

/**
 * Subway Surfers — embedded WebGL game from the uploaded open-source project
 * (https://github.com/.../Subway-Surfers). Hosted under /public/subway-surfers
 * and loaded in an iframe. Score is reported back via postMessage and wired
 * into the Schooltrade leaderboard + arcade points system.
 */
export const RunnerGame = ({ userCode, userName }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => getArcadeBest("runner"));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data: any = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "subway:score") {
        setScore(data.score || 0);
      } else if (data.type === "subway:gameover") {
        const finalScore = Number(data.score) || 0;
        setScore(finalScore);
        if (finalScore > 0) {
          submitScore("runner", userCode, userName, finalScore);
          setArcadeBest("runner", finalScore);
          setBest((b) => Math.max(b, finalScore));
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userCode, userName]);

  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="px-3 py-1.5 rounded-full bg-card border border-border">
          ניקוד: <span className="font-bold text-primary">{score}</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-card border border-border">
          שיא: <span className="font-bold text-accent">{best}</span>
        </div>
        <button
          onClick={() => {
            const f = iframeRef.current;
            if (f) f.src = f.src;
          }}
          className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition"
        >
          🔄 התחל מחדש
        </button>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-black shadow-lg" style={{ aspectRatio: "4 / 3", maxHeight: "75vh" }}>
        <iframe
          ref={iframeRef}
          src="/subway-surfers/game.html"
          title="Subway Surfers"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          style={{ border: 0 }}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        חיצים / החלקה במסך לתנועה • רווח לקפיצה • Esc להשהיה
      </p>
    </div>
  );
};
