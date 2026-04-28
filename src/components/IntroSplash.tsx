import { useEffect, useRef, useState } from "react";
import logo from "@/assets/schooltrade-logo.jpg";

interface IntroSplashProps {
  onFinish: () => void;
}

const FADE_OUT_MS = 1000;

export const IntroSplash = ({ onFinish }: IntroSplashProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    console.log("VIDEO ENDED");
    setExiting(true);
    setTimeout(() => onFinish(), FADE_OUT_MS);
  };

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

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

  // Rotate horizontal video -90deg so it plays left→right while filling a vertical screen.
  // After rotation, the video's rendered width = vh and height = vw.
  // To "cover" the viewport, we scale so that min(vh, vw) covers max(vw, vh).
  const rotatedScale = vw && vh ? Math.max(vw / vh, vh / vw) : 1;

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
        zIndex: 9999,
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
        className="absolute select-none"
        style={{
          pointerEvents: "none",
          top: "50%",
          left: "50%",
          width: `${vh}px`,
          height: `${vw}px`,
          objectFit: "cover",
          transform: `translate(-50%, -50%) rotate(-90deg) scale(${rotatedScale})`,
          transformOrigin: "center center",
        }}
      />

      {/* Soft dark gradient for readability */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.25) 0%, hsl(0 0% 0% / 0) 35%, hsl(0 0% 0% / 0) 65%, hsl(0 0% 0% / 0.6) 100%)",
        }}
      />

      {/* Centered Schooltrade logo overlay */}
      {!hasError && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 2 }}
        >
          <img
            src={logo}
            alt="Schooltrade"
            className="rounded-3xl"
            style={{
              width: "min(42vw, 220px)",
              height: "auto",
              animation: "introLogoIn 1200ms cubic-bezier(0.22, 1, 0.36, 1) both, introLogoGlow 2800ms ease-in-out 1200ms infinite",
              filter: "drop-shadow(0 10px 40px hsl(0 0% 0% / 0.55))",
            }}
          />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-lg" style={{ zIndex: 3 }}>
          שגיאה בטעינת הסרטון
        </div>
      )}

      {needsTap && !hasError && (
        <button
          onClick={enableSound}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/15 backdrop-blur-md text-white text-sm border border-white/25 shadow-lg"
          style={{ zIndex: 4 }}
        >
          הקש להפעלת סאונד
        </button>
      )}

      <style>{`
        @keyframes introLogoIn {
          from { opacity: 0; transform: scale(0.85); filter: blur(6px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes introLogoGlow {
          0%, 100% { filter: drop-shadow(0 10px 40px hsl(0 0% 0% / 0.55)) drop-shadow(0 0 18px hsl(0 0% 100% / 0.15)); }
          50% { filter: drop-shadow(0 10px 40px hsl(0 0% 0% / 0.55)) drop-shadow(0 0 38px hsl(0 0% 100% / 0.45)); }
        }
      `}</style>
    </div>
  );
};

export default IntroSplash;
