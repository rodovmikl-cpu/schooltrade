import { useState, useEffect, useRef } from "react";
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
import BlockedUserMessage from "@/components/BlockedUserMessage";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AnimatedUsername } from "@/components/AnimatedUsername";
import { useChristmas } from "@/contexts/ChristmasContext";
import { ChristmasDecorations } from "@/components/christmas/ChristmasDecorations";
import { ChristmasCountdown } from "@/components/christmas/ChristmasCountdown";
import { ChristmasTabs } from "@/components/christmas/ChristmasTabs";
import { PremiumClubTab } from "@/components/PremiumClubTab";
import { LimitedChatTab } from "@/components/LimitedChatTab";
import { Badge } from "@/components/ui/badge";
import { GamesHub } from "@/components/games/GamesHub";
import { KeifTab } from "@/components/keif/KeifTab";
import { playSound } from "@/lib/sounds";

const PREMIUM_USERS = ["161221063", "752025692", "426671703"];

type ViewType = "login" | "register" | "posts" | "create" | "admin" | "security" | "halloween" | "christmas" | "premiumClub" | "limitedChat" | "games" | "keif";

const Index = () => {
  const [user, setUser] = useState<{ code: string; name: string; role: string } | null>(null);
  const [view, setView] = useState<ViewType>("login");
  const [hasLimitedChat, setHasLimitedChat] = useState(false);
  const [unreadLimitedChat, setUnreadLimitedChat] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { isHalloweenActive } = useHalloween();
  const { isChristmasActive, isChristmasBackgroundOnly } = useChristmas();
  const { toast } = useToast();
  const logoImage = useTemporaryLogo();

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      playSound("pageLoad");
    }, 100);
  }, []);

  const checkLimitedChat = async (userCode: string) => {
    if (PREMIUM_USERS.includes(userCode)) {
      setHasLimitedChat(false);
      return;
    }
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from("private_chats")
        .select("id")
        .eq("is_active", true)
        .or(`user1_code.eq.${userCode},user2_code.eq.${userCode}`)
        .gte("created_at", `${currentMonth}-01`);
      if (!error && data && data.length > 0) {
        setHasLimitedChat(true);
        const lastRead = localStorage.getItem(`limited-chat-read-${userCode}`);
        const lastReadTime = lastRead || new Date(0).toISOString();
        const { count } = await supabase
          .from("private_messages")
          .select("*", { count: "exact", head: true })
          .in("chat_id", data.map(c => c.id))
          .neq("sender_code", userCode)
          .gt("created_at", lastReadTime);
        setUnreadLimitedChat(count || 0);
      } else {
        setHasLimitedChat(false);
      }
    } catch (e) {
      console.error("Error checking limited chat:", e);
    }
  };

  useEffect(() => {
    const savedCode = sessionStorage.getItem("userCode");
    const savedName = sessionStorage.getItem("userName");
    const savedRole = sessionStorage.getItem("userRole");
    if (savedCode && savedName) {
      setUser({ code: savedCode, name: savedName, role: savedRole || "user" });
      setView("posts");
      checkLimitedChat(savedCode);
    }
  }, []);

  const handleRegisterSuccess = (code: string, name: string) => {
    setUser({ code, name, role: "user" });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", "user");
    setView("posts");
    playSound("success");
    toast({ title: "רישום הצליח!", description: `הקוד שלך: ${code}` });
  };

  const handleLoginSuccess = (code: string, name: string, role: string) => {
    setUser({ code, name, role });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", role);
    setView("posts");
    playSound("enter");
    checkLimitedChat(code);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("userCode");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userRole");
    setView("login");
    toast({ title: "התנתקת בהצלחה" });
  };

  const switchView = (v: ViewType) => {
    playSound("tab");
    setView(v);
  };

  const isAdmin = user?.code === "admin" || user?.code === "michaelrodov" || user?.role === "admin";
  const isPremiumUser = PREMIUM_USERS.includes(user?.code || "");

  const getBackgroundClass = () => {
    if (isHalloweenActive) return 'bg-gradient-to-br from-orange-950 via-purple-950 to-black';
    if (isChristmasActive || isChristmasBackgroundOnly) return 'bg-gradient-to-br from-red-950 via-green-950 to-blue-950';
    return 'bg-gradient-to-br from-background via-background to-accent/5';
  };

  const NavBtn = ({ v, label, className = "" }: { v: ViewType; label: string; className?: string }) => (
    <Button
      variant={view === v ? "default" : "outline"}
      onClick={() => switchView(v)}
      onMouseEnter={() => playSound("hover")}
      className={`flex-1 min-w-[140px] transition-all duration-300 ${view === v ? "scale-[1.02] shadow-md" : "hover:scale-[1.01]"} ${className}`}
    >
      {label}
    </Button>
  );

  return (
    <div
      dir="rtl"
      className={`min-h-screen transition-all duration-1000 ${getBackgroundClass()} ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ transition: "opacity 0.5s ease, background 1s ease" }}
    >
      {isHalloweenActive && <HalloweenDecorations />}
      {(isChristmasActive || isChristmasBackgroundOnly) && <ChristmasDecorations />}
      {isChristmasActive && <ChristmasCountdown />}

      <header
        className={`border-b backdrop-blur-md shadow-soft sticky top-0 z-40 transition-all duration-500 ${
          isHalloweenActive
            ? 'bg-orange-900/50 border-orange-500/30'
            : (isChristmasActive || isChristmasBackgroundOnly)
              ? 'bg-red-900/50 border-red-500/30'
              : 'bg-card/70'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="Schooltrade"
              className="w-12 h-12 rounded-lg shadow-md transition-transform duration-300 hover:scale-110 hover:rotate-3"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
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
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:scale-105 transition-transform">
                התנתק
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className={`container mx-auto px-4 py-8 ${isChristmasActive ? 'mt-10' : ''}`}>
        {!user ? (
          <div
            className="max-w-md mx-auto"
            style={{ animation: "fadeSlideIn 0.4s ease-out" }}
          >
            <div className="bg-card rounded-2xl shadow-soft p-8 space-y-6">
              {view === "login" ? (
                <>
                  <LoginForm onSuccess={handleLoginSuccess} />
                  <Button variant="ghost" className="w-full hover:scale-[1.01] transition-transform" onClick={() => setView("register")}>
                    עדיין אין לך חשבון? הירשם כאן
                  </Button>
                </>
              ) : (
                <>
                  <RegistrationForm onSuccess={handleRegisterSuccess} />
                  <Button variant="ghost" className="w-full hover:scale-[1.01] transition-transform" onClick={() => setView("login")}>
                    כבר יש לך חשבון? התחבר כאן
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation */}
            <div
              className="flex gap-3 flex-wrap"
              style={{ animation: "fadeSlideIn 0.4s ease-out" }}
            >
              <NavBtn v="posts" label="📚 המודעות שלי" />
              <NavBtn v="create" label="➕ פרסם מודעה חדשה" />
              <NavBtn v="games" label="🎮 משחקים" className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/60" />
              <NavBtn v="keif" label="🪙 החלף לקיפים" className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30 hover:border-amber-400/60" />
              {isAdmin && (
                <>
                  <NavBtn v="admin" label="🔧 ניהול מערכת" />
                  <NavBtn v="security" label="🛡️ אבטחה" className="bg-blue-500/10 border-blue-500/30" />
                </>
              )}
              {isHalloweenActive && (
                <NavBtn v="halloween" label="🎃 אירוע Halloween" className="bg-orange-500/20 border-orange-500/50" />
              )}
              {isChristmasActive && (
                <NavBtn v="christmas" label="🎄 כריסטמס" className="bg-red-500/20 border-red-500/50" />
              )}
              {isPremiumUser && (
                <NavBtn v="premiumClub" label="🌟 חבר מועדון" className="bg-[#00C853]/10 border-[#00C853]/40" />
              )}
              {!isPremiumUser && hasLimitedChat && (
                <button
                  onClick={() => {
                    switchView("limitedChat");
                    setUnreadLimitedChat(0);
                    localStorage.setItem(`limited-chat-read-${user.code}`, new Date().toISOString());
                  }}
                  onMouseEnter={() => playSound("hover")}
                  className={`flex-1 min-w-[140px] relative px-4 py-2 rounded-md border-2 text-sm font-medium transition-all duration-300 ${
                    view === "limitedChat"
                      ? "bg-primary text-primary-foreground border-primary scale-[1.02] shadow-md"
                      : "bg-card border-blue-500/30 hover:border-blue-400/60 hover:scale-[1.01]"
                  }`}
                >
                  💬 צ'אט פרטי
                  {unreadLimitedChat > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 animate-pulse">
                      {unreadLimitedChat}
                    </Badge>
                  )}
                </button>
              )}
            </div>

            {/* Content with transition */}
            <div
              key={view}
              style={{ animation: "fadeSlideIn 0.35s ease-out" }}
            >
              {view === "posts" && <PostsList userCode={user.code} userName={user.name} isAdmin={isAdmin} />}
              {view === "create" && <CreatePost userCode={user.code} userName={user.name} onSuccess={() => switchView("posts")} />}
              {view === "admin" && isAdmin && <AdminPanel currentUserCode={user.code} />}
              {view === "security" && isAdmin && <SecurityPanel />}
              {view === "halloween" && isHalloweenActive && <HalloweenTabs />}
              {view === "christmas" && isChristmasActive && <ChristmasTabs />}
              {view === "games" && <GamesHub userCode={user.code} userName={user.name} />}
              {view === "keif" && <KeifTab userCode={user.code} userName={user.name} />}
              {view === "premiumClub" && isPremiumUser && <PremiumClubTab userCode={user.code} userName={user.name} />}
              {view === "limitedChat" && !isPremiumUser && hasLimitedChat && <LimitedChatTab userCode={user.code} userName={user.name} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
