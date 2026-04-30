import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  isOfficial?: boolean;
  isMine?: boolean;
};

export const BooksTab = ({ userCode, userName }: BooksTabProps) => {
  const { toast } = useToast();
  const [publicBooks, setPublicBooks] = useState<BookRow[]>([]);
  const [myBooks, setMyBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<ReadingBook | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [submitting, setSubmitting] = useState(false);

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
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
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
        is_public: visibility === "public",
      });
      if (error) throw error;
      playSound("success");
      toast({ title: "הספר פורסם!", description: visibility === "public" ? "כולם יוכלו לקרוא" : "רק אתה תוכל לקרוא" });
      setTitle("");
      setContent("");
      setVisibility("public");
      loadBooks();
    } catch (e: any) {
      toast({ title: "שגיאה בפרסום", description: e.message || "נסה שוב", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMine = async (id: string) => {
    if (!confirm("למחוק את הספר?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id).eq("author_code", userCode);
    if (!error) {
      toast({ title: "נמחק" });
      loadBooks();
    }
  };

  const openBook = (b: ReadingBook) => {
    playSound("enter");
    setReading(b);
  };

  // Combined public list: user public + official seeded
  const officialAsBooks: ReadingBook[] = OFFICIAL_BOOKS.map((o: OfficialBook) => ({
    id: o.id,
    title: o.title,
    author: o.author,
    content: o.content,
    isOfficial: true,
  }));

  const userPublicAsBooks: ReadingBook[] = publicBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author_name,
    content: b.content,
    isMine: b.author_code === userCode,
  }));

  // user-created first
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
          <TabsTrigger value="write" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm">
            ✍️ כתיבת ספר
          </TabsTrigger>
          <TabsTrigger value="public" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm">
            📚 ספרים ציבוריים
          </TabsTrigger>
          <TabsTrigger value="mine" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm">
            🔒 הספרים שלי
          </TabsTrigger>
        </TabsList>

        {/* WRITE */}
        <TabsContent value="write" className="mt-6">
          <div style={{ animation: "fadeSlideIn 0.4s ease-out" }} className="max-w-2xl mx-auto space-y-4">
            <div className="notebook-paper" style={{ minHeight: 480 }}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="כותרת הספר..."
                maxLength={120}
                style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="התחל לכתוב כאן את הספר שלך..."
                rows={14}
                maxLength={50000}
                className="resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => { playSound("tab"); setVisibility("public"); }}
                  className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                    visibility === "public"
                      ? "bg-amber-600 text-white border-amber-700 scale-105"
                      : "bg-card border-amber-500/30 hover:border-amber-500/60"
                  }`}
                >
                  🌍 ציבורי
                </button>
                <button
                  onClick={() => { playSound("tab"); setVisibility("private"); }}
                  className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                    visibility === "private"
                      ? "bg-amber-600 text-white border-amber-700 scale-105"
                      : "bg-card border-amber-500/30 hover:border-amber-500/60"
                  }`}
                >
                  🔒 פרטי
                </button>
              </div>
              <div className="text-xs text-muted-foreground">{content.length} / 50000 תווים</div>
            </div>

            <Button
              onClick={handlePublish}
              disabled={submitting}
              className="w-full bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-lg py-6 shadow-md hover:scale-[1.01] transition-transform"
            >
              {submitting ? "מפרסם..." : "פרסם"}
            </Button>
          </div>
        </TabsContent>

        {/* PUBLIC */}
        <TabsContent value="public" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען ספרים...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
              {allPublic.map((b, idx) => (
                <BookCard
                  key={b.id}
                  book={b}
                  onOpen={() => openBook(b)}
                  delay={idx * 30}
                />
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
            <p className="text-center text-muted-foreground">עדיין לא כתבת ספרים. עבור לכרטיסיית "כתיבת ספר" כדי להתחיל.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
              {myBooks.map((b, idx) => (
                <div key={b.id} className="relative">
                  <BookCard
                    book={{ id: b.id, title: b.title, author: b.author_name, content: b.content, isMine: true }}
                    onOpen={() => openBook({ id: b.id, title: b.title, author: b.author_name, content: b.content, isMine: true })}
                    delay={idx * 30}
                    badge={b.is_public ? "ציבורי" : "פרטי"}
                  />
                  <button
                    onClick={() => handleDeleteMine(b.id)}
                    className="absolute top-2 left-2 text-xs bg-red-500/80 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                    מחק
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BookCard = ({ book, onOpen, delay, badge }: { book: ReadingBook; onOpen: () => void; delay: number; badge?: string }) => {
  const preview = book.content.replace(/\s+/g, " ").trim().slice(0, 110);
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
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">📖 ספר רשמי</Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-[10px]">✍️ משתמש</Badge>
        )}
        {badge && <Badge className="bg-blue-100 text-blue-900 hover:bg-blue-100 text-[10px]">{badge}</Badge>}
      </div>
    </button>
  );
};

const BookReader = ({ book, onClose }: { book: ReadingBook; onClose: () => void }) => {
  // Simple paginator: split content into pages of ~900 chars by paragraph boundaries
  const [pageIndex, setPageIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const pages = (() => {
    const chunks: string[] = [];
    const paragraphs = book.content.split(/\n+/).filter(Boolean);
    let buf = "";
    const max = 900;
    for (const p of paragraphs) {
      if ((buf + "\n\n" + p).length > max && buf.length > 0) {
        chunks.push(buf);
        buf = p;
      } else {
        buf = buf ? buf + "\n\n" + p : p;
      }
    }
    if (buf) chunks.push(buf);
    return chunks.length ? chunks : [book.content];
  })();

  const goNext = () => {
    if (pageIndex < pages.length - 1) {
      playSound("tab");
      setPageIndex(pageIndex + 1);
      setAnimKey(animKey + 1);
    }
  };
  const goPrev = () => {
    if (pageIndex > 0) {
      playSound("tab");
      setPageIndex(pageIndex - 1);
      setAnimKey(animKey + 1);
    }
  };

  return (
    <div dir="rtl" className="space-y-4 animate-book-open">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { playSound("tab"); onClose(); }}
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
        </div>

        <div className="relative" style={{ perspective: "1500px" }}>
          <div
            key={animKey}
            className="book-page rounded-xl p-6 sm:p-10 animate-page-flip-in"
            style={{ minHeight: 480, fontSize: 17, lineHeight: 1.9 }}
          >
            <div className="whitespace-pre-wrap" style={{ textAlign: "justify" }}>
              {pages[pageIndex]}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button
            onClick={goPrev}
            disabled={pageIndex === 0}
            variant="outline"
            className="hover:scale-[1.02] transition-transform"
          >
            ← הקודם
          </Button>
          <Button
            onClick={goNext}
            disabled={pageIndex === pages.length - 1}
            className="bg-amber-600 hover:bg-amber-700 text-white hover:scale-[1.02] transition-transform"
          >
            הבא →
          </Button>
        </div>
      </div>
    </div>
  );
};
