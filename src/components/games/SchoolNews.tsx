import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface NewsItem {
  id: string;
  author_code: string;
  author_name: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

interface SchoolNewsProps {
  userCode: string;
  userName: string;
}

const PUBLISHER_CODE = "426671703";

export const SchoolNews = ({ userCode, userName }: SchoolNewsProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  const isPublisher = userCode === PUBLISHER_CODE;

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("school_news")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNews((data as NewsItem[]) || []);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את החדשות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const publishNews = async () => {
    if (!newContent.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין תוכן לחדשות",
        variant: "destructive"
      });
      return;
    }

    setPublishing(true);
    try {
      const { error } = await supabase
        .from("school_news")
        .insert({
          author_code: userCode,
          author_name: userName,
          content: newContent.trim(),
          image_url: newImageUrl.trim() || null
        });

      if (error) throw error;

      toast({
        title: "פורסם בהצלחה!",
        description: "החדשות פורסמו לכל המשתמשים"
      });

      setNewContent("");
      setNewImageUrl("");
      fetchNews();
    } catch (error) {
      console.error("Error publishing news:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לפרסם את החדשות",
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase
        .from("school_news")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "נמחק בהצלחה",
        description: "החדשות נמחקו"
      });

      fetchNews();
    } catch (error) {
      console.error("Error deleting news:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את החדשות",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: he });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">📰 חדשות של רמות ויצמן</h2>
        <p className="text-muted-foreground">כל העדכונים והחדשות מבית הספר</p>
      </div>

      {/* Publisher Panel */}
      {isPublisher && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <p className="font-medium">📝 פרסום חדשות חדשות</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="כתוב את תוכן החדשות כאן..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Input
              placeholder="קישור לתמונה (אופציונלי)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              dir="ltr"
            />
            <Button 
              onClick={publishNews} 
              disabled={publishing || !newContent.trim()}
              className="w-full"
            >
              {publishing ? "מפרסם..." : "פרסם חדשות"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* News Feed */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {news.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-4xl mb-4">📭</p>
                <p>אין חדשות עדיין</p>
              </CardContent>
            </Card>
          ) : (
            news.map((item) => (
              <Card key={item.id} className="animate-fade-in overflow-hidden">
                {item.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={item.image_url} 
                      alt="News" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.author_name}</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        מפרסם רשמי
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                  {isPublisher && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteNews(item.id)}
                    >
                      🗑️ מחק
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
