import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";

interface Msg {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schooltrade-bot`;

const getChatKey = () => {
  // Per-user storage key based on logged in user from localStorage
  try {
    const userCode = localStorage.getItem("userCode") || "default";
    return `schooltrade-bot-chat-${userCode}`;
  } catch { return "schooltrade-bot-chat-default"; }
};

const loadMessages = (): Msg[] => {
  try {
    const saved = localStorage.getItem(getChatKey());
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
};

const saveMessages = (msgs: Msg[]) => {
  try { localStorage.setItem(getChatKey(), JSON.stringify(msgs)); } catch { /* ignore */ }
};

export const SchooltradeBot = () => {
  const [messages, setMessages] = useState<Msg[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = () => {
    playSound("click");
    setClearing(true);
    setTimeout(() => {
      localStorage.removeItem(getChatKey());
      setMessages([]);
      setClearing(false);
      playPremiumSound("sparkle");
    }, 400);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    playSound("click");
    const userMsg: Msg = { role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          const updated = prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          return updated;
        }
        return [...prev, { role: "assistant", content: assistantSoFar, timestamp: Date.now() }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "שגיאה" }));
        upsertAssistant(err.error || "שגיאה בתקשורת עם הבוט");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      playPremiumSound("sparkle");
    } catch (e) {
      console.error(e);
      upsertAssistant("שגיאה בחיבור לשרת");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold premium-text-glow text-[#00C853]">🤖 schooltrade bot (אלפא)</h3>
        <p className="text-sm text-muted-foreground">עוזר חכם ובטוח לתלמידים</p>
      </div>

      <Card className="border-[#00C853]/30 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div ref={scrollRef} className={`h-[400px] overflow-y-auto p-4 space-y-3 transition-opacity duration-300 ${clearing ? "opacity-0" : "opacity-100"}`}>
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12 space-y-2">
              <div className="text-4xl">🤖</div>
              <p>שלום! אני schooltrade bot.</p>
              <p className="text-sm">אני יכול לעזור בלימודים, לענות על שאלות, ולעזור ליצור מודעות למכירה.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-[#00C853]/10 border border-[#00C853]/20"
              }`}>
                {msg.role === "assistant" && <span className="text-xs text-[#00C853] font-bold block mb-1">🤖 הבוט</span>}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[10px] text-muted-foreground mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-end">
              <div className="bg-[#00C853]/10 border border-[#00C853]/20 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00C853] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#00C853] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#00C853] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#00C853]/20 p-3 flex gap-2">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="כתוב הודעה..."
            className="flex-1 border-[#00C853]/30 focus:border-[#00C853]"
            onKeyDown={(e) => { if (e.key === "Enter") send(); }} disabled={isLoading} />
          <Button onClick={send} disabled={isLoading || !input.trim()} className="bg-[#00C853] hover:bg-[#00C853]/90 text-white px-6">שלח</Button>
        </div>
      </Card>

      {messages.length > 0 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground hover:text-destructive">
            🗑️ נקה שיחה
          </Button>
        </div>
      )}
    </div>
  );
};
