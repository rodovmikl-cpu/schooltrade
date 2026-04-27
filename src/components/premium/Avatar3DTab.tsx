import { useState, useRef, Suspense, useEffect, Component, ReactNode, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import * as THREE from "three";

const READY_PLAYER_ME_EMBED_URL = "https://readyplayer.me/avatar?frameApi&clearCache";
const STORAGE_KEY = "rpm_avatar_url";
type CreatorStatus = "idle" | "loading" | "ready" | "error";

interface Avatar3DTabProps {
  userCode?: string;
}

const isValidAvatarUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith("readyplayer.me") || value.includes(".glb") || value.includes(".png"))
    );
  } catch {
    return false;
  }
};

const parseFrameMessage = (raw: unknown): Record<string, any> | null => {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, any>) : null;
};

const extractAvatarUrl = (raw: unknown) => {
  if (typeof raw === "string" && isValidAvatarUrl(raw)) return raw;
  const data = parseFrameMessage(raw);
  const candidates = [
    data?.data?.url,
    data?.data?.avatarUrl,
    data?.url,
    data?.avatarUrl,
    data?.avatar?.url,
  ];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && isValidAvatarUrl(candidate)) || null;
};

class AvatarErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function AvatarMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = -1.35 + Math.sin(state.clock.elapsedTime * 1.5) * 0.015;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
  });

  return (
    <group ref={ref} position={[0, -1.35, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export const Avatar3DTab = ({ userCode }: Avatar3DTabProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatus>("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const persistAvatar = useCallback(async (url: string) => {
    setAvatarUrl(url);
    localStorage.setItem(STORAGE_KEY, url);

    if (userCode) {
      try {
        await (supabase as any)
          .from("user_avatars")
          .upsert({ user_code: userCode, avatar_url: url }, { onConflict: "user_code" });
      } catch (error) {
        console.error("Error saving avatar:", error);
      }
    }
  }, [userCode]);

  useEffect(() => {
    if (!userCode) return;

    let active = true;
    (supabase as any)
      .from("user_avatars")
      .select("avatar_url")
      .eq("user_code", userCode)
      .maybeSingle()
      .then(({ data }: { data: { avatar_url?: string } | null }) => {
        if (active && data?.avatar_url && isValidAvatarUrl(data.avatar_url)) {
          setAvatarUrl(data.avatar_url);
          localStorage.setItem(STORAGE_KEY, data.avatar_url);
        }
      });

    return () => {
      active = false;
    };
  }, [userCode]);

  useEffect(() => {
    if (!creatorOpen) {
      setCreatorStatus("idle");
      return;
    }

    setCreatorStatus("loading");
    const timeout = window.setTimeout(() => setCreatorStatus((status) => status === "loading" ? "error" : status), 18000);
    return () => window.clearTimeout(timeout);
  }, [creatorOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const json = parseFrameMessage(event.data);
      const eventName = json?.eventName || json?.type;

      if (json?.source === "readyplayerme" && eventName === "v1.frame.ready") {
        setCreatorStatus("ready");
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }),
          "*"
        );
      }

      const url = extractAvatarUrl(event.data);
      if (url) {
        void persistAvatar(url);
        setCreatorOpen(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [persistAvatar]);

  const resetAvatar = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAvatarUrl(null);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">🧍 אווטאר תלת־ממדי</h2>
        <p className="text-sm text-muted-foreground">דמות ריאליסטית באיכות משחק</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[380px] bg-gradient-to-b from-muted/40 to-muted/10 relative">
          {avatarUrl ? (
            <Canvas camera={{ position: [0, 0.2, 2.2], fov: 35 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[3, 5, 2]} intensity={1.2} />
              <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#a5b4fc" />
              <pointLight position={[0, 2, 3]} intensity={0.6} color="#ffd9a8" />
              <Suspense fallback={null}>
                <AvatarErrorBoundary
                  key={avatarUrl}
                  onError={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setAvatarUrl(null);
                  }}
                >
                  <AvatarMesh url={avatarUrl} />
                </AvatarErrorBoundary>
              </Suspense>
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                target={[0, 0.1, 0]}
                minPolarAngle={Math.PI / 2.6}
                maxPolarAngle={Math.PI / 1.9}
              />
            </Canvas>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
              <div className="text-6xl">🧑‍🎨</div>
              <p className="text-base font-semibold">צור את הדמות הריאליסטית שלך</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                לחץ על "עצב את הדמות שלך" כדי לפתוח את היוצר ולבנות אווטאר
                ריאליסטי בסגנון משחק
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button className="w-full" onClick={() => setCreatorOpen(true)}>
          🎨 עצב את הדמות שלך
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={resetAvatar}
          disabled={!avatarUrl}
        >
          🔄 איפוס דמות
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        מופעל על ידי Ready Player Me — דמויות ריאליסטיות באיכות משחק
      </p>

      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent className="max-w-3xl h-[85vh] min-h-[500px] p-0 overflow-visible z-[60] flex flex-col" dir="rtl">
          <DialogHeader className="p-3 pb-0 shrink-0">
            <DialogTitle>עיצוב הדמות</DialogTitle>
            <DialogDescription className="sr-only">עורך אווטאר Ready Player Me</DialogDescription>
          </DialogHeader>
          <div className="relative min-h-0 flex-1 overflow-visible bg-background">
            {creatorStatus === "loading" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  טוען...
                </div>
              </div>
            )}
            {creatorStatus === "error" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background text-sm font-semibold text-destructive">
                שגיאה בטעינת עורך הדמות
              </div>
            )}
            {creatorOpen && (
              <iframe
                ref={iframeRef}
                src={READY_PLAYER_ME_EMBED_URL}
                style={{ width: "100%", height: "100%", border: "none", touchAction: "auto" }}
                className="block min-h-[420px]"
                allow="camera *; microphone *"
                title="Ready Player Me Avatar Creator"
                onLoad={() => setCreatorStatus("ready")}
                onError={() => setCreatorStatus("error")}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
