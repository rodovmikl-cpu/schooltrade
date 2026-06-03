import { useEffect, useRef, useState } from "react";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest, getArcadeBest } from "@/lib/arcadePoints";

interface Props { userCode: string; userName: string; }

/**
 * Hosts the uploaded Subway-Surfers-master project (in public/subway-surfers/)
 * inside an iframe. The game posts {type:'subway:score'} and
 * {type:'subway:gameover'} messages which we forward to the Schooltrade
 * leaderboard + Keif arcade-best storage.
 */
export const RunnerGame = ({ userCode, userName }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => getArcadeBest("runner"));
  const submittedRef = useRef(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as any;
      if (!data || typeof data !== "object") return;
      if (data.type === "subway:score") {
        setScore(data.score || 0);
      } else if (data.type === "subway:gameover") {
        const finalScore = Math.floor(data.score || 0);
        setScore(finalScore);
        if (!submittedRef.current && finalScore > 0) {
          submittedRef.current = true;
          try { submitScore("runner", userCode, userName, finalScore); } catch {}
          setArcadeBest("runner", finalScore);
          setBest(getArcadeBest("runner"));
        }
      } else if (data.type === "subway:start") {
        submittedRef.current = false;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userCode, userName]);

  return (
    <div dir="rtl" className="w-full h-full flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="px-3 py-1 rounded-full bg-secondary/60 border border-border">
          ניקוד נוכחי: <span className="font-bold text-primary">{score}</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-secondary/60 border border-border">
          שיא אישי: <span className="font-bold">{best}</span>
        </div>
      </div>
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-black" style={{ aspectRatio: "16 / 10", minHeight: 420 }}>
        <iframe
          ref={iframeRef}
          src="/runner/index.html"
          title="Metro Runner"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          style={{ border: 0 }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        חצים / WASD לתנועה • רווח או חץ למעלה לקפיצה • חץ למטה או S להחלקה • במובייל: החלק את האצבע
      </p>
    </div>
  );
};

export default RunnerGame;
