import { useEffect, useRef, useState } from "react";

interface IntroSplashProps {
  onFinish: () => void;
}

const MAX_DURATION_MS = 6000;

export const IntroSplash = ({ onFinish }: IntroSplashProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    setTimeout(() => onFinish(), 900);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Try to play with sound first; if blocked, mute and play, then unmute on tap
    const tryPlay = async () => {
      try {
        v.muted = false;
        v.volume = 1;
        await v.play();
      } catch {
        try {
          v.muted = true;
          await v.play();
          setNeedsTap(true);
        } catch {
          // Give up and finish quickly
          finish();
        }
      }
    };
    tryPlay();

    const onEnded = () => finish();
    v.addEventListener("ended", onEnded);

    const t = setTimeout(finish, MAX_DURATION_MS);
    return () => {
      clearTimeout(t);
      v.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enableSound = () => {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {});
    }
    setNeedsTap(false);
  };

  return (
    <div
      dir="rtl"
      onClick={needsTap ? enableSound : undefined}
      className="fixed inset-0 z-[9999] overflow-hidden bg-black"
      style={{
        opacity: exiting ? 0 : 1,
        transition: "opacity 800ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mov"
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      {/* Soft dark gradient for readability */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.15) 0%, hsl(0 0% 0% / 0) 35%, hsl(0 0% 0% / 0) 65%, hsl(0 0% 0% / 0.55) 100%)",
        }}
      />

      {needsTap && (
        <button
          onClick={enableSound}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/15 backdrop-blur-md text-white text-sm border border-white/25 shadow-lg animate-[fadeSlideIn_0.4s_ease-out]"
        >
          הקש להפעלת סאונד
        </button>
      )}

      <button
        onClick={finish}
        className="absolute top-4 left-4 text-white/80 text-xs px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/20"
      >
        דלג
      </button>
    </div>
  );
};

export default IntroSplash;
