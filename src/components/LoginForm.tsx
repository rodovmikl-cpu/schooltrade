import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onSuccess: (code: string, name: string, role: string) => void;
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      toast({ title: "שגיאה", description: "אנא הזן קוד", variant: "destructive" });
      return;
    }

    // Validate code format (9 digits)
    if (!/^\d{9}$/.test(trimmedCode)) {
      toast({ 
        title: "שגיאה", 
        description: "הקוד חייב להיות בדיוק 9 ספרות", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("code", trimmedCode)
        .maybeSingle();

      if (error) {
        console.error("Login query error:", error);
        throw new Error("שגיאה בחיבור לשרת. נסה שוב.");
      }

      if (!data) {
        toast({
          title: "שגיאת התחברות",
          description: "קוד לא נמצא במערכת. בדוק שהקוד נכון או הירשם.",
          variant: "destructive",
        });
        return;
      }

      // Ensure all required fields exist
      if (!data.code || !data.name) {
        toast({
          title: "שגיאה",
          description: "החשבון פגום. פנה לתמיכה.",
          variant: "destructive",
        });
        return;
      }

      onSuccess(data.code, data.name, data.role || "user");
      toast({
        title: "התחברת בהצלחה!",
        description: `ברוך הבא, ${data.name}`,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "שגיאת התחברות",
        description: error.message || "אירעה שגיאה בעת ההתחברות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
          התחברות
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          הזן את הקוד שלך כדי להתחבר
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">קוד (9 ספרות)</Label>
        <Input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="הזן קוד בן 9 ספרות"
          maxLength={9}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "מתחבר..." : "התחבר"}
      </Button>
    </form>
  );
};

export default LoginForm;
