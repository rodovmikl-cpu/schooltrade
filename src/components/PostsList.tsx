import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageCircle } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AnimatedUsername } from "@/components/AnimatedUsername";

interface Post {
  id: string;
  owner_code: string;
  owner_name: string;
  description: string;
  price: string;
  photo_url: string;
  photo_path: string;
  created_at: string;
  posting_mode?: string;
  original_price?: string;
  current_bid_price?: number;
  auction_active?: boolean;
  max_bid_limit?: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_code: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface PostsListProps {
  userCode: string;
  userName: string;
  isAdmin: boolean;
}

const PostsList = ({ userCode, userName, isAdmin }: PostsListProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    fetchComments();

    // Set up realtime subscriptions
    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data || []) as Post[]);
    } catch (error: any) {
      console.error("Fetch posts error:", error);
      toast({
        title: "שגיאה בטעינת המודעות",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group comments by post_id
      const commentsByPost: Record<string, Comment[]> = {};
      (data || []).forEach((comment) => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment as Comment);
      });

      setComments(commentsByPost);
    } catch (error: any) {
      console.error("Fetch comments error:", error);
    }
  };

  const handlePlaceBid = async (postId: string, post: Post) => {
    const bidAmount = parseFloat(bidAmounts[postId] || "0");
    
    if (!bidAmount || bidAmount <= 0) {
      toast({
        title: "הכנס סכום תקין",
        variant: "destructive",
      });
      return;
    }

    const currentBid = post.current_bid_price || 0;
    const maxLimit = post.max_bid_limit || 200;
    
    if (currentBid + bidAmount > maxLimit) {
      toast({
        title: "הצעת מחיר גבוהה מדי",
        description: `ניתן להעלות עד ${maxLimit}₪`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert bid
      const { error: bidError } = await supabase
        .from("bids")
        .insert({
          post_id: postId,
          bid_amount: bidAmount,
        });

      if (bidError) throw bidError;

      // Update post price
      const newBidPrice = currentBid + bidAmount;
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          current_bid_price: newBidPrice,
        })
        .eq("id", postId);

      if (updateError) throw updateError;

      setBidAmounts((prev) => ({ ...prev, [postId]: "" }));
      toast({ title: "ההצעה נוספה בהצלחה!" });
    } catch (error: any) {
      console.error("Bid error:", error);
      toast({
        title: "שגיאה בהוספת הצעה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (post.auction_active && post.owner_code === userCode) {
      toast({
        title: "לא ניתן למחוק",
        description: "לא ניתן למחוק מודעה פעילה בסחירת פלומביט",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("האם אתה בטוח שברצונך למחוק מודעה זו?")) return;

    try {
      // Delete storage object
      if (post.photo_path) {
        await supabase.storage.from("schooltrade-photos").remove([post.photo_path]);
      }

      // Delete post
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;

      toast({ title: "המודעה נמחקה בהצלחה" });
    } catch (error: any) {
      console.error("Delete post error:", error);
      toast({
        title: "שגיאה במחיקת המודעה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!userCode || !userName) {
      toast({
        title: "יש להתחבר כדי להגיב",
        variant: "destructive",
      });
      return;
    }

    const commentText = commentTexts[postId]?.trim();
    if (!commentText) return;

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_code: userCode,
          user_name: userName,
          content: commentText,
        });

      if (error) throw error;

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      toast({ title: "התגובה נוספה בהצלחה" });
    } catch (error: any) {
      console.error("Add comment error:", error);
      toast({
        title: "שגיאה בהוספת תגובה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תגובה זו?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({ title: "התגובה נמחקה בהצלחה" });
    } catch (error: any) {
      console.error("Delete comment error:", error);
      toast({
        title: "שגיאה במחיקת התגובה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canDeleteComment = (comment: Comment) => 
    isAdmin || comment.user_code === userCode;

  const canDelete = (post: Post) => isAdmin || post.owner_code === userCode;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">טוען מודעות...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-2xl shadow-soft">
        <p className="text-muted-foreground">אין עדיין מודעות במערכת</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-card rounded-2xl shadow-soft overflow-hidden hover:shadow-glow transition-all"
        >
          {/* Image */}
          <img
            src={post.photo_url}
            alt={post.description}
            className="w-full h-64 object-cover"
          />

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <AnimatedUsername userCode={post.owner_code}>
                    <p className="font-semibold text-lg">{post.owner_name}</p>
                  </AnimatedUsername>
                  <PremiumBadge userCode={post.owner_code} />
                  <VerifiedBadge userCode={post.owner_code} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("he-IL")}
                </p>
                {post.posting_mode === "auction" && (
                  <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    סחירת פלומביט
                  </span>
                )}
              </div>
              <div className="text-left">
                {post.posting_mode === "auction" ? (
                  <div>
                    <div className="text-primary font-bold text-xl">
                      {parseFloat(post.original_price || post.price) + (post.current_bid_price || 0)}₪
                    </div>
                    {post.current_bid_price! > 0 && (
                      <div className="text-xs text-muted-foreground">
                        מחיר התחלה: {post.original_price}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-primary font-bold text-xl">{post.price}</div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-foreground">{post.description}</p>

            {/* Comments */}
            {comments[post.id] && comments[post.id].length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>תגובות ({comments[post.id].length})</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments[post.id].map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <AnimatedUsername userCode={comment.user_code}>
                              <p className="font-semibold">{comment.user_name}</p>
                            </AnimatedUsername>
                            <PremiumBadge userCode={comment.user_code} />
                            <VerifiedBadge userCode={comment.user_code} />
                          </div>
                          <p className="text-muted-foreground">{comment.content}</p>
                        </div>
                        {canDeleteComment(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auction Bidding */}
            {post.posting_mode === "auction" && post.auction_active && userCode && (
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-semibold">הצע מחיר (בעילום שם)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bidAmounts[post.id] || ""}
                    onChange={(e) =>
                      setBidAmounts((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="סכום להוספה..."
                    min="1"
                    max={post.max_bid_limit! - (post.current_bid_price || 0)}
                  />
                  <Button
                    size="sm"
                    onClick={() => handlePlaceBid(post.id, post)}
                    disabled={!bidAmounts[post.id]}
                  >
                    הצע
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  מקסימום: {post.max_bid_limit}₪ | נותרו: {post.max_bid_limit! - (post.current_bid_price || 0)}₪
                </p>
              </div>
            )}

            {/* Add Comment */}
            {userCode ? (
              <div className="flex gap-2">
                <Input
                  value={commentTexts[post.id] || ""}
                  onChange={(e) =>
                    setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  placeholder="הוסף תגובה..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddComment(post.id);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleAddComment(post.id)}
                  disabled={!commentTexts[post.id]?.trim()}
                >
                  שלח
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                התחבר כדי להגיב
              </p>
            )}

            {/* Delete Button */}
            {canDelete(post) && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleDeletePost(post)}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק מודעה
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostsList;
