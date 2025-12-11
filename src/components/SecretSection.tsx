import { Card } from "@/components/ui/card";
import { Lock, Crown, Star, Sparkles } from "lucide-react";

export const SecretSection = () => {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-3">
          <Crown className="w-10 h-10 text-[#00C853]" />
          <h2 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
            אזור סודי
          </h2>
          <Crown className="w-10 h-10 text-[#00C853]" />
        </div>
        <p className="text-muted-foreground text-lg">
          ברוכים הבאים לאזור האקסקלוסיבי שלנו
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-[#00C853]/10 to-[#00C853]/5 border-[#00C853]/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <Star className="w-32 h-32 text-[#00C853]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#00C853]" />
              <h3 className="text-2xl font-bold">גישה בלעדית</h3>
            </div>
            <p className="text-muted-foreground">
              אתם חלק מקבוצת המשתמשים המועדפים של Schooltrade. אזור זה נבנה במיוחד עבורכם.
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 opacity-10">
            <Lock className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-[#00C853]" />
              <h3 className="text-2xl font-bold">יתרונות פרמיום</h3>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>✓ גישה למשחק טטריס בלעדי</li>
              <li>✓ צ'אטים פרטיים עם משתמשים</li>
              <li>✓ תג "חבר מועדון" מיוחד</li>
              <li>✓ אנימציית שם משתמש ייחודית</li>
            </ul>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2 bg-gradient-to-r from-[#00C853]/5 via-primary/5 to-accent/5">
          <h3 className="text-2xl font-bold mb-4 text-center">תכונות נוספות בקרוב</h3>
          <p className="text-center text-muted-foreground">
            אנחנו עובדים על תכונות פרמיום נוספות שיהיו זמינות רק עבורכם. הישארו מעודכנים!
          </p>
        </Card>
      </div>

      <div className="text-center p-6 bg-card rounded-lg border border-[#00C853]/20">
        <p className="text-lg text-muted-foreground">
          תודה שאתם חלק מקהילת VIP של <span className="font-bold text-[#00C853]">Schooltrade</span>
        </p>
      </div>
    </div>
  );
};
