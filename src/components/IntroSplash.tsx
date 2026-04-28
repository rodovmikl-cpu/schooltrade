import { useEffect, useRef, useState } from "react";

interface IntroSplashProps {
  onFinish: () => void;
}

const FADE_OUT_MS = 1000;

export const IntroSplash = ({ onFinish }: IntroSplashProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [hasError, setHasError] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    console.log("VIDEO ENDED");
    setExiting(true);
    setTimeout(() => onFinish(), FADE_OUT_MS);
  };

  useEffect(() => {
    console.log("INTRO VISIBLE");
    const v = videoRef.current;
    if (!v) return;

    v.controls = false;
    (v as any).disablePictureInPicture = true;
    v.setAttribute("controlsList", "nodownload noplaybackrate nofullscreen noremoteplayback");

    const tryPlay = async () => {
      try {
        v.muted = false;
        v.volume = 1;
        await v.play();
        console.log("VIDEO STARTED");
      } catch {
        try {
          v.muted = true;
          await v.play();
          console.log("VIDEO STARTED (muted)");
          setNeedsTap(true);
        } catch (err) {
          console.log("VIDEO ERROR", err);
          setHasError(true);
        }
      }
    };
    tryPlay();

    const onEnded = () => finish();
    const onError = () => {
      console.log("VIDEO ERROR");
      setHasError(true);
    };
    const onPause = () => {
      if (!finishedRef.current && !v.ended) {
        v.play().catch(() => {});
      }
    };
    const onContext = (e: Event) => e.preventDefault();

    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    v.addEventListener("pause", onPause);
    v.addEventListener("contextmenu", onContext);

    return () => {
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
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
      console.log("UNMUTED ON TAP");
    }
    setNeedsTap(false);
  };

  return (
    <div
      dir="rtl"
      onClick={needsTap ? enableSound : undefined}
      onTouchStart={needsTap ? enableSound : undefined}
      className="fixed inset-0 overflow-hidden bg-black"
      style={{
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483647,
        opacity: exiting ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mov"
        playsInline
        // @ts-ignore - legacy iOS attribute
        webkit-playsinline="true"
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

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
          שגיאה בטעינת הסרטון
        </div>
      )}

      {needsTap && !hasError && (
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
