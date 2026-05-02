import { useState, useEffect, useRef, useCallback, useMemo, TouchEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_BOOKS, OfficialBook } from "@/lib/officialBooks";
import { playSound } from "@/lib/sounds";

interface BooksTabProps {
  userCode: string;
  userName: string;
}

interface BookRow {
  id: string;
  title: string;
  content: string;
  author_code: string;
  author_name: string;
  is_public: boolean;
  created_at: string;
}

type ReadingBook = {
  id: string;
  title: string;
  author: string;
  content: string;
  preview?: string;
  contentStatus?: "public_domain" | "preview" | "user_full";
  fullTextUrl?: string;
  externalUrl?: string;
  sourceLabel?: string;
  expectedMinLength?: number;
  isOfficial?: boolean;
  isMine?: boolean;
};

// Draft = a book being edited locally (Canva-style tabs)
interface Draft {
  id: string; // local id
  title: string;
  content: string;
  visibility: "public" | "private";
  savedAt?: number;
}

const DRAFTS_KEY = (code: string) => `books_drafts_${code}`;
const ACTIVE_DRAFT_KEY = (code: string) => `books_active_draft_${code}`;

const newDraft = (): Draft => ({
  id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  title: "",
  content: "",
  visibility: "public",
});

export const BooksTab = ({ userCode, userName }: BooksTabProps) => {
  const { toast } = useToast();
  const [publicBooks, setPublicBooks] = useState<BookRow[]>([]);
  const [myBooks, setMyBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<ReadingBook | null>(null);

  // ---- Multi-book drafts ----
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fadingId, setFadingId] = useState<string | null>(null);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY(userCode));
      const activeRaw = localStorage.getItem(ACTIVE_DRAFT_KEY(userCode));
      if (raw) {
        const parsed: Draft[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDrafts(parsed);
          setActiveDraftId(activeRaw && parsed.some((d) => d.id === activeRaw) ? activeRaw : parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("drafts load failed", e);
    }
    const d = newDraft();
    setDrafts([d]);
    setActiveDraftId(d.id);
  }, [userCode]);

  // Auto-save drafts
  useEffect(() => {
    if (drafts.length === 0) return;
    try {
      localStorage.setItem(DRAFTS_KEY(userCode), JSON.stringify(drafts));
      if (activeDraftId) localStorage.setItem(ACTIVE_DRAFT_KEY(userCode), activeDraftId);
    } catch (e) {
      console.error("drafts save failed", e);
    }
  }, [drafts, activeDraftId, userCode]);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0];

  const updateActive = (patch: Partial<Draft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === activeDraftId ? { ...d, ...patch, savedAt: Date.now() } : d))
    );
  };

  const addDraft = () => {
    playSound("tab");
    const d = newDraft();
    setDrafts((prev) => [...prev, d]);
    setActiveDraftId(d.id);
  };

  const closeDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (next.length === 0) {
        const fresh = newDraft();
        setActiveDraftId(fresh.id);
        return [fresh];
      }
      if (id === activeDraftId) setActiveDraftId(next[0].id);
      return next;
    });
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { data: pub } = await supabase
        .from("books")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      const { data: mine } = await supabase
        .from("books")
        .select("*")
        .eq("author_code", userCode)
        .order("created_at", { ascending: false });
      setPublicBooks((pub as BookRow[]) || []);
      setMyBooks((mine as BookRow[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [userCode]);

  const handlePublish = async () => {
    if (!activeDraft) return;
    const cleanTitle = activeDraft.title.trim();
    const cleanContent = activeDraft.content.trim();
    if (cleanTitle.length < 2) {
      toast({ title: "כותרת קצרה מדי", description: "הוסף כותרת לספר", variant: "destructive" });
      return;
    }
    if (cleanContent.length < 10) {
      toast({ title: "תוכן קצר מדי", description: "כתוב לפחות 10 תווים", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("books").insert({
        author_code: userCode,
        author_name: userName,
        title: cleanTitle,
        content: cleanContent,
        is_public: activeDraft.visibility === "public",
      });
      if (error) throw error;
      playSound("success");
      toast({
        title: "הספר פורסם!",
        description: activeDraft.visibility === "public" ? "כולם יוכלו לקרוא" : "רק אתה תוכל לקרוא",
      });
      // Close this draft after publish
      closeDraft(activeDraft.id);
      loadBooks();
    } catch (e: any) {
      toast({ title: "שגיאה בפרסום", description: e.message || "נסה שוב", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setFadingId(id);
    // Wait for fade animation
    await new Promise((r) => setTimeout(r, 300));
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", id)
      .eq("author_code", userCode);
    if (error) {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
      setFadingId(null);
      return;
    }
    // Optimistic UI update
    setMyBooks((prev) => prev.filter((b) => b.id !== id));
    setPublicBooks((prev) => prev.filter((b) => b.id !== id));
    setFadingId(null);
    playSound("success");
    toast({ title: "הספר נמחק" });
  };

  const openBook = (b: ReadingBook) => {
    playSound("enter");
    setReading(b);
  };

  const officialAsBooks: ReadingBook[] = OFFICIAL_BOOKS.map((o: OfficialBook) => ({
    id: o.id,
    title: o.title,
    author: o.author,
    content: o.content,
    preview: o.preview,
    contentStatus: o.contentStatus,
    fullTextUrl: o.fullTextUrl,
    externalUrl: o.externalUrl,
    sourceLabel: o.sourceLabel,
    expectedMinLength: o.expectedMinLength,
    isOfficial: true,
  }));

  const userPublicAsBooks: ReadingBook[] = publicBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author_name,
    content: b.content,
    contentStatus: "user_full",
    isMine: b.author_code === userCode,
  }));

  const allPublic: ReadingBook[] = [...userPublicAsBooks, ...officialAsBooks];

  if (reading) {
    return <BookReader book={reading} onClose={() => setReading(null)} />;
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-l from-amber-700 to-amber-500 bg-clip-text text-transparent">
          📚 ספרים
        </h2>
        <p className="text-sm text-muted-foreground mt-1">קרא, כתוב ופרסם ספרים משלך</p>
      </div>

      <Tabs defaultValue="write" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-amber-500/10">
          <TabsTrigger
            value="write"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            ✍️ כתיבת ספר
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            📚 ספרים ציבוריים
          </TabsTrigger>
          <TabsTrigger
            value="mine"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            🔒 הספרים שלי
          </TabsTrigger>
        </TabsList>

        {/* WRITE — Canva-style multi-book editor */}
        <TabsContent value="write" className="mt-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Book tabs bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin" style={{ scrollbarWidth: "thin" }}>
              {drafts.map((d, idx) => {
                const isActive = d.id === activeDraftId;
                const label = d.title.trim() ? d.title.slice(0, 16) : `ספר ${idx + 1}`;
                return (
                  <div
                    key={d.id}
                    className={`group flex items-center gap-1 px-3 py-2 rounded-t-lg border-2 border-b-0 cursor-pointer whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-amber-600 text-white border-amber-700 scale-[1.02]"
                        : "bg-card border-amber-500/30 hover:border-amber-500/60 text-foreground"
                    }`}
                    onClick={() => {
                      if (!isActive) {
                        playSound("tab");
                        setActiveDraftId(d.id);
                      }
                    }}
                    style={{ animation: "fadeSlideIn 0.25s ease-out" }}
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDraft(d.id);
                      }}
                      className={`ml-1 text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors ${
                        isActive ? "hover:bg-white/20" : "hover:bg-amber-500/20"
                      }`}
                      title="סגור"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addDraft}
                className="px-3 py-2 rounded-lg border-2 border-dashed border-amber-500/50 text-amber-700 hover:bg-amber-500/10 hover:border-amber-500 text-sm whitespace-nowrap transition-all"
                title="ספר חדש"
              >
                ➕ ספר חדש
              </button>
            </div>

            {activeDraft && (
              <div
                key={activeDraft.id}
                style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                className="space-y-4"
              >
                <div className="notebook-paper" style={{ minHeight: 480 }}>
                  <Input
                    value={activeDraft.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    placeholder="כותרת הספר..."
                    maxLength={120}
                    style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}
                  />
                  <Textarea
                    value={activeDraft.content}
                    onChange={(e) => updateActive({ content: e.target.value })}
                    placeholder="התחל לכתוב כאן את הספר שלך..."
                    rows={14}
                    maxLength={50000}
                    className="resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        playSound("tab");
                        updateActive({ visibility: "public" });
                      }}
                      className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                        activeDraft.visibility === "public"
                          ? "bg-amber-600 text-white border-amber-700 scale-105"
                          : "bg-card border-amber-500/30 hover:border-amber-500/60"
                      }`}
                    >
                      🌍 ציבורי
                    </button>
                    <button
                      onClick={() => {
                        playSound("tab");
                        updateActive({ visibility: "private" });
                      }}
                      className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                        activeDraft.visibility === "private"
                          ? "bg-amber-600 text-white border-amber-700 scale-105"
                          : "bg-card border-amber-500/30 hover:border-amber-500/60"
                      }`}
                    >
                      🔒 פרטי
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{activeDraft.content.length} / 50000 תווים</span>
                    {activeDraft.savedAt && (
                      <span className="text-emerald-600">✓ נשמר אוטומטית</span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handlePublish}
                  disabled={submitting}
                  className="w-full bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-lg py-6 shadow-md hover:scale-[1.01] transition-transform"
                >
                  {submitting ? "מפרסם..." : "פרסם"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PUBLIC */}
        <TabsContent value="public" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען ספרים...</p>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              style={{ animation: "fadeSlideIn 0.4s ease-out" }}
            >
              {allPublic.map((b, idx) => (
                <BookCard key={b.id} book={b} onOpen={() => openBook(b)} delay={idx * 30} />
              ))}
              {allPublic.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground">אין ספרים עדיין</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* MINE */}
        <TabsContent value="mine" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען...</p>
          ) : myBooks.length === 0 ? (
            <p className="text-center text-muted-foreground">
              עדיין לא כתבת ספרים. עבור לכרטיסיית "כתיבת ספר" כדי להתחיל.
            </p>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              style={{ animation: "fadeSlideIn 0.4s ease-out" }}
            >
              {myBooks.map((b, idx) => {
                const fading = fadingId === b.id;
                return (
                  <div
                    key={b.id}
                    className="relative transition-all duration-300"
                    style={{
                      opacity: fading ? 0 : 1,
                      transform: fading ? "scale(0.9)" : "scale(1)",
                    }}
                  >
                    <BookCard
                      book={{
                        id: b.id,
                        title: b.title,
                        author: b.author_name,
                        content: b.content,
                        contentStatus: "user_full",
                        isMine: true,
                      }}
                      onOpen={() =>
                        openBook({
                          id: b.id,
                          title: b.title,
                          author: b.author_name,
                          content: b.content,
                          contentStatus: "user_full",
                          isMine: true,
                        })
                      }
                      delay={idx * 30}
                      badge={b.is_public ? "ציבורי" : "פרטי"}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(b.id);
                      }}
                      className="absolute top-2 left-2 text-xs bg-red-500/90 text-white px-2.5 py-1 rounded-md hover:bg-red-600 transition-all hover:scale-105 shadow-md"
                    >
                      🗑️ מחק ספר
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח שברצונך למחוק?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תסיר את הספר לצמיתות מכל הכרטיסיות. לא ניתן לבטל.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              כן, מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const BookCard = ({
  book,
  onOpen,
  delay,
  badge,
}: {
  book: ReadingBook;
  onOpen: () => void;
  delay: number;
  badge?: string;
}) => {
  const preview = (book.preview || book.content).replace(/\s+/g, " ").trim().slice(0, 110);
  return (
    <button
      onClick={onOpen}
      className="book-card-hover text-right rounded-xl overflow-hidden border-2 border-amber-700/40 book-cover relative h-48 p-4 flex flex-col justify-between text-amber-50"
      style={{ animation: "fadeSlideIn 0.4s ease-out", animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-y-0 right-0 w-3 book-spine-shadow pointer-events-none" />
      <div>
        <div className="font-bold text-lg leading-tight line-clamp-2 drop-shadow">{book.title}</div>
        <div className="text-xs opacity-80 mt-1">מאת {book.author}</div>
      </div>
      <div className="text-xs opacity-90 line-clamp-3 leading-snug">{preview}...</div>
      <div className="flex justify-between items-center">
        {book.isOfficial ? (
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
            {book.contentStatus === "public_domain" ? "📖 נחלת הכלל" : "📄 תצוגה מקדימה"}
          </Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-[10px]">
            ✍️ משתמש
          </Badge>
        )}
        {badge && (
          <Badge className="bg-blue-100 text-blue-900 hover:bg-blue-100 text-[10px]">{badge}</Badge>
        )}
      </div>
    </button>
  );
};

const paginateText = (text: string, maxChars = 1200) => {
  const pages: string[] = [];
  const pushPart = (part: string) => {
    const words = part.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        pages.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) pages.push(line);
  };
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let buffer = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (buffer) {
        pages.push(buffer);
        buffer = "";
      }
      pushPart(paragraph);
      continue;
    }
    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars && buffer) {
      pages.push(buffer);
      buffer = paragraph;
    } else {
      buffer = next;
    }
  }
  if (buffer) pages.push(buffer);
  return pages.length ? pages : [text];
};

const BookReader = ({ book, onClose }: { book: ReadingBook; onClose: () => void }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPageIndex(0);
    setFullContent(null);
    setLoadError(null);

    if (book.contentStatus !== "public_domain" || !book.fullTextUrl) return;

    setIsLoadingFull(true);
    supabase.functions.invoke("book-content", { body: { url: book.fullTextUrl } })
      .then(({ data, error }) => {
        if (!active) return;
        const content = typeof data?.content === "string" ? data.content.trim() : "";
        const minLength = book.expectedMinLength || 12000;
        if (error || content.length < minLength) {
          setLoadError("הספר המלא לא נטען בשלמותו, לכן מוצגת תצוגה מקדימה בלבד.");
          return;
        }
        setFullContent(content);
      })
      .catch(() => {
        if (active) setLoadError("הספר המלא לא נטען בשלמותו, לכן מוצגת תצוגה מקדימה בלבד.");
      })
      .finally(() => {
        if (active) setIsLoadingFull(false);
      });

    return () => { active = false; };
  }, [book.id, book.contentStatus, book.fullTextUrl, book.expectedMinLength]);

  const displayContent = fullContent || book.content;
  const isPreviewOnly = book.contentStatus === "preview" || (!!loadError && !fullContent);
  const pages = useMemo(() => paginateText(displayContent), [displayContent]);

  const goNext = useCallback(() => {
    setPageIndex((prev) => {
      if (prev >= pages.length - 1) return prev;
      try {
        playSound("tab");
      } catch {}
      setDirection("next");
      setAnimKey((k) => k + 1);
      return prev + 1;
    });
  }, [pages.length]);

  const goPrev = useCallback(() => {
    setPageIndex((prev) => {
      if (prev <= 0) return prev;
      try {
        playSound("tab");
      } catch {}
      setDirection("prev");
      setAnimKey((k) => k + 1);
      return prev - 1;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // RTL: ArrowLeft = next, ArrowRight = prev
      if (e.key === "ArrowLeft") goNext();
      else if (e.key === "ArrowRight") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    // RTL: swipe right (dx>0) → previous page, swipe left → next
    if (dx > 0) goPrev();
    else goNext();
  };

  return (
    <div dir="rtl" className="space-y-4 animate-book-open">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            playSound("tab");
            onClose();
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          חזרה לרשימת הספרים
        </button>
        <div className="text-sm text-muted-foreground">
          עמוד {pageIndex + 1} מתוך {pages.length}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-3">
          <h3 className="text-2xl font-bold">{book.title}</h3>
          <p className="text-sm text-muted-foreground">מאת {book.author}</p>
          {book.isOfficial && (
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
              {book.contentStatus === "public_domain" && !fullContent && !loadError && (
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                  {isLoadingFull ? "טוען ספר מלא..." : "ספר בנחלת הכלל"}
                </Badge>
              )}
              {fullContent && (
                <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                  הספר המלא נטען מ־{book.sourceLabel || "מקור ציבורי"}
                </Badge>
              )}
              {isPreviewOnly && (
                <Badge className="bg-blue-100 text-blue-900 hover:bg-blue-100">
                  תצוגה מקדימה + תקציר
                </Badge>
              )}
            </div>
          )}
          {loadError && <p className="text-xs text-muted-foreground mt-2">{loadError}</p>}
          {isPreviewOnly && book.preview && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">תקציר: {book.preview}</p>
          )}
          {isPreviewOnly && book.externalUrl && (
            <a
              href={book.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-amber-700 hover:underline"
            >
              המשך קריאה במקור חיצוני
            </a>
          )}
        </div>

        <div
          className="relative select-none"
          style={{ perspective: "1500px" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            key={animKey}
            className="book-page rounded-xl p-6 sm:p-10"
            style={{
              minHeight: 480,
              fontSize: 17,
              lineHeight: 1.9,
              animation: `pageFlip${direction === "next" ? "Next" : "Prev"} 0.35s ease-out`,
            }}
          >
            <div className="whitespace-pre-wrap" style={{ textAlign: "justify" }}>
              {pages[pageIndex]}
            </div>
            {isLoadingFull && pageIndex === pages.length - 1 && (
              <div className="mt-6 text-center text-sm text-muted-foreground">טוען עמודים נוספים...</div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-4 gap-3">
          <Button
            onClick={goPrev}
            disabled={pageIndex === 0}
            variant="outline"
            className="hover:scale-[1.02] transition-transform flex-1 sm:flex-none"
          >
            ← הקודם
          </Button>
          <div className="text-xs text-muted-foreground self-center hidden sm:block">
            החלק או השתמש בחיצי המקלדת
          </div>
          <Button
            onClick={goNext}
            disabled={pageIndex === pages.length - 1}
            className="bg-amber-600 hover:bg-amber-700 text-white hover:scale-[1.02] transition-transform flex-1 sm:flex-none"
          >
            הבא →
          </Button>
        </div>
      </div>

      {/* Inline keyframes for page flip (fallback-safe) */}
      <style>{`
        @keyframes pageFlipNext {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pageFlipPrev {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
