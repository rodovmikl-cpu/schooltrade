import { useState, useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as THREE from "three";

// Ready Player Me — free, commercially licensed, rigged GLB avatars (mobile optimized)
const RPM_SUBDOMAIN = "demo"; // public demo subdomain
const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024&lod=1";

function AvatarMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    // Idle breathing + subtle sway
    ref.current.position.y = -1.35 + Math.sin(state.clock.elapsedTime * 1.5) * 0.015;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
  });

  return (
    <group ref={ref} position={[0, -1.35, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export const Avatar3DTab = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return localStorage.getItem("rpm_avatar_url") || DEFAULT_AVATAR_URL;
  });
  const [creatorOpen, setCreatorOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = typeof event.data === "string" ? event.data : "";
      // Ready Player Me posts the avatar GLB url as a string ending in .glb
      if (data && typeof data === "string" && data.includes(".glb")) {
        const optimized = data.includes("?")
          ? data
          : `${data}?morphTargets=ARKit&textureAtlas=1024&lod=1`;
        setAvatarUrl(optimized);
        localStorage.setItem("rpm_avatar_url", optimized);
        setCreatorOpen(false);
      }
      // JSON event format
      try {
        const json = JSON.parse(data);
        if (json?.eventName === "v1.avatar.exported" && json?.data?.url) {
          const url = json.data.url;
          const optimized = url.includes("?")
            ? url
            : `${url}?morphTargets=ARKit&textureAtlas=1024&lod=1`;
          setAvatarUrl(optimized);
          localStorage.setItem("rpm_avatar_url", optimized);
          setCreatorOpen(false);
        }
      } catch {
        // not JSON, ignore
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const resetAvatar = () => {
    localStorage.removeItem("rpm_avatar_url");
    setAvatarUrl(DEFAULT_AVATAR_URL);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">🧍 אווטאר תלת־ממדי</h2>
        <p className="text-sm text-muted-foreground">דמות ריאליסטית באיכות משחק</p>
      </div>

      {/* 3D Canvas with realistic RPM avatar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[380px] bg-gradient-to-b from-muted/40 to-muted/10">
          <Canvas camera={{ position: [0, 0.2, 2.2], fov: 35 }} shadows>
            <ambientLight intensity={0.7} />
            <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
            <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#a5b4fc" />
            <pointLight position={[0, 2, 3]} intensity={0.6} color="#ffd9a8" />
            <Suspense fallback={null}>
              <AvatarMesh url={avatarUrl} />
            </Suspense>
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              target={[0, 0.1, 0]}
              minPolarAngle={Math.PI / 2.6}
              maxPolarAngle={Math.PI / 1.9}
            />
          </Canvas>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button className="w-full" onClick={() => setCreatorOpen(true)}>
          🎨 עצב את הדמות שלך
        </Button>
        <Button variant="outline" className="w-full" onClick={resetAvatar}>
          🔄 איפוס דמות
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        מופעל על ידי Ready Player Me — דמויות ריאליסטיות באיכות משחק
      </p>

      {/* Ready Player Me creator iframe */}
      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-3 pb-0">
            <DialogTitle>עיצוב הדמות</DialogTitle>
          </DialogHeader>
          <iframe
            ref={iframeRef}
            src={`https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi&clearCache`}
            className="w-full h-full border-0"
            allow="camera *; microphone *"
            title="Ready Player Me Avatar Creator"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Preload default avatar
useGLTF.preload(DEFAULT_AVATAR_URL);
