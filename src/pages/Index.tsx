import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTemporaryLogo } from "@/hooks/useTemporaryLogo";
import RegistrationForm from "@/components/RegistrationForm";
import LoginForm from "@/components/LoginForm";
import PostsList from "@/components/PostsList";
import CreatePost from "@/components/CreatePost";
import AdminPanel from "@/components/AdminPanel";
import { SecurityPanel } from "@/components/SecurityPanel";
import { useHalloween } from "@/contexts/HalloweenContext";
import { HalloweenDecorations } from "@/components/halloween/HalloweenDecorations";
import { HalloweenTabs } from "@/components/halloween/HalloweenTabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SnakeGame } from "@/components/SnakeGame";
import BlockedUserMessage from "@/components/BlockedUserMessage";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AnimatedUsername } from "@/components/AnimatedUsername";
import { useChristmas } from "@/contexts/ChristmasContext";
import { ChristmasDecorations } from "@/components/christmas/ChristmasDecorations";
import { ChristmasCountdown } from "@/components/christmas/ChristmasCountdown";
import { ChristmasTabs } from "@/components/christmas/ChristmasTabs";
import { PremiumClubTab } from "@/components/PremiumClubTab";

const Index = () => {
  const [user, setUser] = useState<{ code: string; name: string; role: string } | null>(null);
  const [view, setView] = useState<"login" | "register" | "posts" | "create" | "admin" | "security" | "halloween" | "snake" | "christmas" | "premiumClub">("login");
  const { isHalloweenActive } = useHalloween();
  const { isChristmasActive, isChristmasBackgroundOnly } = useChristmas();
  const { toast } = useToast();
  const logoImage = useTemporaryLogo();

  useEffect(() => {
    // Check if user is stored in session
    const savedCode = sessionStorage.getItem("userCode");
    const savedName = sessionStorage.getItem("userName");
    const savedRole = sessionStorage.getItem("userRole");
    
    if (savedCode && savedName) {
      setUser({ code: savedCode, name: savedName, role: savedRole || "user" });
      setView("posts");
    }
  }, []);

  const handleRegisterSuccess = (code: string, name: string) => {
    setUser({ code, name, role: "user" });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", "user");
    setView("posts");
    toast({
      title: "רישום הצליח!",
      description: `הקוד שלך: ${code}`,
    });
  };

  const handleLoginSuccess = (code: string, name: string, role: string) => {
    setUser({ code, name, role });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", role);
    setView("posts");
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("userCode");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userRole");
    setView("login");
    toast({ title: "התנתקת בהצלחה" });
  };

  const isAdmin = user?.code === "admin" || user?.code === "michaelrodov" || user?.role === "admin";
  const isPremiumUser = ["161221063", "752025692", "468786933"].includes(user?.code || "");

  // Determine background based on active events
  const getBackgroundClass = () => {
    if (isHalloweenActive) {
      return 'bg-gradient-to-br from-orange-950 via-purple-950 to-black';
    }
    if (isChristmasActive || isChristmasBackgroundOnly) {
      return 'bg-gradient-to-br from-red-950 via-green-950 to-blue-950';
    }
    return 'bg-gradient-to-br from-background via-background to-accent/5';
  };

  return (
    <div 
      dir="rtl" 
      className={`min-h-screen transition-colors duration-1000 ${getBackgroundClass()}`}
    >
      {/* Halloween Effects */}
      {isHalloweenActive && <HalloweenDecorations />}
      
      {/* Christmas Effects */}
      {(isChristmasActive || isChristmasBackgroundOnly) && <ChristmasDecorations />}
      {isChristmasActive && <ChristmasCountdown />}

      {/* Header */}
      <header 
        className={`border-b backdrop-blur-sm shadow-soft sticky top-0 z-40 ${
          isHalloweenActive 
            ? 'bg-orange-900/50 border-orange-500/30' 
            : (isChristmasActive || isChristmasBackgroundOnly)
              ? 'bg-red-900/50 border-red-500/30'
              : 'bg-card/50'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Schooltrade" className="w-12 h-12 rounded-lg shadow-md" />
            <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Schooltrade
            </h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                שלום, <AnimatedUsername userCode={user.code}><strong>{user.name}</strong></AnimatedUsername>
                <PremiumBadge userCode={user.code} />
                <VerifiedBadge userCode={user.code} />
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                התנתק
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 ${isChristmasActive ? 'mt-10' : ''}`}>
        {!user ? (
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl shadow-soft p-8 space-y-6">
              {view === "login" ? (
                <>
                  <LoginForm onSuccess={handleLoginSuccess} />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setView("register")}
                  >
                    עדיין אין לך חשבון? הירשם כאן
                  </Button>
                </>
              ) : (
                <>
                  <RegistrationForm onSuccess={handleRegisterSuccess} />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setView("login")}
                  >
                    כבר יש לך חשבון? התחבר כאן
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="flex gap-4 flex-wrap">
              <Button
                variant={view === "posts" ? "default" : "outline"}
                onClick={() => setView("posts")}
                className="flex-1 min-w-[140px]"
              >
                📚 המודעות שלי
              </Button>
              <Button
                variant={view === "create" ? "default" : "outline"}
                onClick={() => setView("create")}
                className="flex-1 min-w-[140px]"
              >
                ➕ פרסם מודעה חדשה
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant={view === "admin" ? "default" : "outline"}
                    onClick={() => setView("admin")}
                    className="flex-1 min-w-[140px]"
                  >
                    🔧 ניהול מערכת
                  </Button>
                  <Button
                    variant={view === "security" ? "default" : "outline"}
                    onClick={() => setView("security")}
                    className="flex-1 min-w-[140px] bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50"
                  >
                    🛡️ אבטחה
                  </Button>
                </>
              )}
              {isHalloweenActive && (
                <Button
                  variant={view === "halloween" ? "default" : "outline"}
                  onClick={() => setView("halloween")}
                  className="flex-1 min-w-[140px] bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50"
                >
                  🎃 אירוע Halloween
                </Button>
              )}
              {isChristmasActive && (
                <Button
                  variant={view === "christmas" ? "default" : "outline"}
                  onClick={() => setView("christmas")}
                  className="flex-1 min-w-[140px] bg-red-500/20 hover:bg-red-500/30 border-red-500/50"
                >
                  🎄 כריסטמס
                </Button>
              )}
              <Button
                variant={view === "snake" ? "default" : "outline"}
                onClick={() => setView("snake")}
                className="flex-1 min-w-[140px]"
              >
                🐍 משחק הנחש
              </Button>
              {isPremiumUser && (
                <Button
                  variant={view === "premiumClub" ? "default" : "outline"}
                  onClick={() => setView("premiumClub")}
                  className="flex-1 min-w-[140px] bg-[#00C853]/20 hover:bg-[#00C853]/30 border-[#00C853]/50"
                >
                  🌟 חבר מועדון
                </Button>
              )}
            </div>

            {/* Content */}
            {view === "posts" && <PostsList userCode={user.code} userName={user.name} isAdmin={isAdmin} />}
            {view === "create" && <CreatePost userCode={user.code} userName={user.name} onSuccess={() => setView("posts")} />}
            {view === "admin" && isAdmin && <AdminPanel currentUserCode={user.code} />}
            {view === "security" && isAdmin && <SecurityPanel />}
            {view === "halloween" && isHalloweenActive && <HalloweenTabs />}
            {view === "christmas" && isChristmasActive && <ChristmasTabs />}
            {view === "snake" && <SnakeGame />}
            {view === "premiumClub" && isPremiumUser && <PremiumClubTab userCode={user.code} userName={user.name} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
