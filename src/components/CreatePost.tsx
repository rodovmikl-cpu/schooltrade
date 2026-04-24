import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload } from "lucide-react";

interface CreatePostProps {
  userCode: string;
  userName: string;
  onSuccess: () => void;
}

const CreatePost = ({ userCode, userName, onSuccess }: CreatePostProps) => {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [postingMode, setPostingMode] = useState<"regular" | "auction">("regular");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const { toast } = useToast();

  const attachStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setCameraActive(true);
    // Defer to next tick so the <video> element exists in DOM
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const startCamera = (mode: "environment" | "user" = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback to native capture input
      cameraFallbackRef.current?.click();
      return;
    }
    setFacingMode(mode);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: mode }, audio: false })
      .then(attachStream)
      .catch((error) => {
        console.error("Camera error:", error);
        // Try without facingMode constraint
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(attachStream)
          .catch((err2) => {
            console.error("Camera fallback error:", err2);
            toast({
              title: "שגיאה בפתיחת המצלמה",
              description: "פותח מצלמת מערכת במקום",
              variant: "destructive",
            });
            cameraFallbackRef.current?.click();
          });
      });
  };

  const switchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    startCamera(next);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setPhotoBlob(blob);
              setPhoto(URL.createObjectURL(blob));
            }
            stopCamera();
          },
          "image/jpeg",
          0.85
        );
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "שגיאה",
        description: "אנא בחר קובץ תמונה",
        variant: "destructive",
      });
      return;
    }

    setPhotoBlob(file);
    setPhoto(URL.createObjectURL(file));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !price.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות",
        variant: "destructive",
      });
      return;
    }

    if (!photo || !photoBlob) {
      toast({
        title: "שגיאה",
        description: "אנא הוסף תמונה",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const postId = crypto.randomUUID();
      const ext = photoBlob.type === "image/png" ? "png" : "jpg";
      const fileName = `posts/${postId}.${ext}`;
      const contentType = photoBlob.type || "image/jpeg";

      setUploadProgress(30);

      // Upload raw blob/file directly to storage (avoids preview fetch proxy issues)
      const { error: uploadError } = await supabase.storage
        .from("schooltrade-photos")
        .upload(fileName, photoBlob, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(uploadError.message || "שגיאה בהעלאת התמונה לאחסון");
      }

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("schooltrade-photos")
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Create post
      const { error: postError } = await supabase.from("posts").insert({
        id: postId,
        owner_code: userCode,
        owner_name: userName,
        description: description.trim(),
        price: price.trim(),
        photo_path: fileName,
        photo_url: urlData.publicUrl,
        posting_mode: postingMode,
        original_price: postingMode === "auction" ? price.trim() : null,
        current_bid_price: postingMode === "auction" ? 0 : 0,
        auction_active: postingMode === "auction",
      });

      if (postError) throw postError;

      setUploadProgress(100);

      toast({
        title: "המודעה פורסמה בהצלחה!",
        description: "המודעה שלך זמינה כעת",
      });

      setDescription("");
      setPrice("");
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
      setPhoto(null);
      setPhotoBlob(null);
      setPostingMode("regular");
      onSuccess();
    } catch (error: any) {
      console.error("Post creation error:", error);
      toast({
        title: "שגיאה בפרסום המודעה",
        description: error.message || "אירעה שגיאה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl shadow-soft p-8">
        <h2 className="text-2xl font-bold mb-6 gradient-primary bg-clip-text text-transparent">
          פרסם מודעה חדשה
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Posting Mode */}
          <div className="space-y-4">
            <Label>סוג המודעה</Label>
            <RadioGroup value={postingMode} onValueChange={(value) => setPostingMode(value as "regular" | "auction")}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="font-normal cursor-pointer">מודעה רגילה</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="auction" id="auction" />
                <Label htmlFor="auction" className="font-normal cursor-pointer">סחירת פלומביט</Label>
              </div>
            </RadioGroup>
            {postingMode === "auction" && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                במצב סחירת פלומביט, משתמשים אחרים יכולים בעילום שם להעלות את מחיר המוצר עד לסכום של 200₪. המחיר יתעדכן בזמן אמת, והמודעה לא ניתנת לעריכה במהלך המכירה.
              </p>
            )}
          </div>

          {/* Photo Capture */}
          <div className="space-y-4">
            <Label>תמונת המוצר</Label>
            
            {!cameraActive && !photo && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    onClick={() => startCamera()}
                    variant="outline"
                    className="h-32 border-dashed flex-col"
                  >
                    <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                    <span>צלם תמונה</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={triggerFileInput}
                    variant="outline"
                    className="h-32 border-dashed flex-col"
                  >
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <span>בחר מהגלריה</span>
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            )}

            {cameraActive && (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={capturePhoto} className="flex-1">
                    📸 צלם
                  </Button>
                  <Button type="button" onClick={stopCamera} variant="outline">
                    ביטול
                  </Button>
                </div>
              </div>
            )}

            {photo && !cameraActive && (
              <div className="space-y-4">
                <img src={photo} alt="Preview" className="w-full rounded-lg" />
                <Button
                  type="button"
                  onClick={() => {
                    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
                    setPhoto(null);
                    setPhotoBlob(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  בחר תמונה אחרת
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">תיאור המוצר</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את המוצר שלך..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">מחיר</Label>
            <Input
              id="price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="למשל: 100 ₪"
              disabled={loading}
            />
          </div>

          {uploadProgress !== null && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">מעלה... {uploadProgress}%</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "מפרסם..." : "פרסם מודעה"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
