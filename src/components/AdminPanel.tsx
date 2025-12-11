import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface User {
  id: string;
  code: string;
  name: string;
  role: string;
  created_at: string;
}

const AdminPanel = ({ currentUserCode }: { currentUserCode: string }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, [currentUserCode]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_code: currentUserCode,
        _role: 'admin'
      });

      if (error) throw error;
      
      if (data === true) {
        setIsAdmin(true);
        fetchUsers();
      } else {
        toast({
          title: "אין הרשאה",
          description: "אין לך הרשאות מנהל",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Admin check error:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לאמת הרשאות",
        variant: "destructive"
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Fetch users error:", error);
      toast({
        title: "שגיאה בטעינת משתמשים",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.name}?`)) return;

    try {
      // Delete all posts by this user
      const { data: userPosts, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("owner_code", user.code);

      if (fetchError) throw fetchError;

      // Delete storage objects
      if (userPosts && userPosts.length > 0) {
        const photoPaths = userPosts
          .map((p) => p.photo_path)
          .filter(Boolean) as string[];
        
        if (photoPaths.length > 0) {
          await supabase.storage.from("schooltrade-photos").remove(photoPaths);
        }

        // Delete posts
        const { error: deletePostsError } = await supabase
          .from("posts")
          .delete()
          .eq("owner_code", user.code);

        if (deletePostsError) throw deletePostsError;
      }

      // Delete user
      const { error: deleteUserError } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

      if (deleteUserError) throw deleteUserError;

      toast({
        title: "המשתמש נמחק בהצלחה",
        description: `${user.name} וכל המודעות שלו נמחקו`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Delete user error:", error);
      toast({
        title: "שגיאה במחיקת משתמש",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">טוען משתמשים...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-2xl shadow-soft p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive mb-2">אין הרשאה</h2>
          <p className="text-muted-foreground">אין לך הרשאות מנהל לצפות בדף זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">ניהול משתמשים</h2>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold">{user.name}</p>
                <VerifiedBadge userCode={user.code} />
              </div>
              <p className="text-sm text-muted-foreground">
                קוד: {user.code} • {user.role === "admin" ? "מנהל" : "משתמש"}
              </p>
              <p className="text-xs text-muted-foreground">
                הצטרף: {new Date(user.created_at).toLocaleDateString("he-IL")}
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteUser(user)}
              disabled={user.code === "admin" || user.code === "michaelrodov"}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק
            </Button>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <p className="text-center text-muted-foreground py-8">אין משתמשים במערכת</p>
      )}
    </div>
  );
};

export default AdminPanel;
