import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  title: string;
  credit: { name: string; url: string; license: string };
  controls?: string;
  aspect?: string;
  minHeight?: number;
}

/**
 * Generic host for a static open-source HTML5 game living under public/premium-games/.
 * Provides fullscreen toggle, reload, and credit line — mirrors the Runner pattern.
 */
export const IframeGame = ({
  src,
  title,
  credit,
  controls,
  aspect = "16 / 10",
  minHeight = 480,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFs = async () => {
    if (!wrapRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapRef.current.requestFullscreen();
    } catch {}
  };

  return (
    <div dir="rtl" className="w-full h-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-secondary/60 border border-border font-semibold">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            Open Source · {credit.license}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setKey((k) => k + 1)}
            className="px-3 py-1 rounded-md bg-secondary/60 border border-border text-xs hover:bg-secondary transition"
          >
            🔄 אתחל
          </button>
          <button
            onClick={toggleFs}
            className="px-3 py-1 rounded-md bg-primary/80 border border-primary text-xs text-primary-foreground hover:bg-primary transition"
          >
            {isFs ? "⤢ צא ממסך מלא" : "⛶ מסך מלא"}
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full rounded-xl overflow-hidden border border-border bg-black"
        style={{ aspectRatio: aspect, minHeight }}
      >
        <iframe
          key={key}
          ref={iframeRef}
          src={src}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; gamepad"
          style={{ border: 0 }}
        />
      </div>

      {controls && (
        <p className="text-xs text-muted-foreground text-center">{controls}</p>
      )}
      <p className="text-[10px] text-muted-foreground/70 text-center">
        קרדיט:{" "}
        <a
          href={credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          {credit.name}
        </a>{" "}
        · רישיון {credit.license}
      </p>
    </div>
  );
};

export default IframeGame;
