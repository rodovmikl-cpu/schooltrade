import { useEffect, useRef, useState } from "react";

interface IntroSplashProps {
  onFinish: () => void;
}

// Hard safety cap (well above real video length) — only used if `ended` never fires
const SAFETY_CAP_MS = 20000;
const FADE_OUT_MS = 1200;

export const IntroSplash = ({ onFinish }: IntroSplashProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    setTimeout(() => onFinish(), FADE_OUT_MS);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Ensure no native controls / no user interruption
    v.controls = false;
    (v as any).disablePictureInPicture = true;
    v.setAttribute("controlsList", "nodownload noplaybackrate nofullscreen noremoteplayback");

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
          finish();
        }
      }
    };
    tryPlay();

    const onEnded = () => finish();
    v.addEventListener("ended", onEnded);

    // Block any attempt to pause the video (e.g. tab visibility, accidental taps)
    const onPause = () => {
      if (!finishedRef.current && !v.ended) {
        v.play().catch(() => {});
      }
    };
    v.addEventListener("pause", onPause);

    const onContext = (e: Event) => e.preventDefault();
    v.addEventListener("contextmenu", onContext);

    const safety = setTimeout(finish, SAFETY_CAP_MS);
    return () => {
      clearTimeout(safety);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("contextmenu", onContext);
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
      onTouchStart={needsTap ? enableSound : undefined}
      className="fixed inset-0 z-[9999] overflow-hidden bg-black"
      style={{
        opacity: exiting ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mov"
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
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
    </div>
  );
};

export default IntroSplash;
