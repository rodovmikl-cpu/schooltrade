import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface School {
  name: string;
  code: string;
}

const SCHOOLS: School[] = [
  { name: "רמות וויצמן", code: "367927369" },
];

interface SchoolCodeGateProps {
  onVerified: () => void;
}

export const SchoolCodeGate = ({ onVerified }: SchoolCodeGateProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();

    if (!/^\d{9}$/.test(trimmed)) {
      setError("הקוד חייב להכיל בדיוק 9 ספרות");
      triggerShake();
      return;
    }

    const found = SCHOOLS.find(s => s.code === trimmed);
    if (!found) {
      setError("קוד בית הספר שגוי. נסה שוב.");
      triggerShake();
      return;
    }

    setError("");
    sessionStorage.setItem("schoolVerified", "true");
    sessionStorage.setItem("schoolCode", trimmed);
    onVerified();
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4" dir="rtl">
      <div
        className={`bg-card rounded-2xl shadow-soft p-8 max-w-md w-full space-y-6 transition-transform ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        style={{ animation: "fadeSlideIn 0.4s ease-out" }}
      >
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">🏫</div>
          <h2 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            כניסה לבית הספר
          </h2>
          <p className="text-sm text-muted-foreground">
            הזן את קוד בית הספר שלך כדי להמשיך
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolCode">קוד בית ספר (9 ספרות)</Label>
            <Input
              id="schoolCode"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                setCode(v);
                if (error) setError("");
              }}
              placeholder="הזן קוד בן 9 ספרות"
              maxLength={9}
              className="text-center text-lg tracking-widest"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center animate-[fadeSlideIn_0.2s_ease-out]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={code.length !== 9}>
            אמת קוד בית ספר
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          קבל את הקוד מהנהלת בית הספר
        </p>
      </div>
    </div>
  );
};
