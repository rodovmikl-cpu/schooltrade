# Schooltrade - שוק לימודים לסטודנטים

פלטפורמה למכירת וקנייה של ספרי לימוד וחומרי לימוד בין סטודנטים, עם תמיכה מלאה בעברית ו-RTL.

## 🎯 תכונות

- ✅ רישום והתחברות עם קודים בני 9 ספרות
- 📸 צילום תמונות ישירות מהמצלמה
- 🗄️ העלאת תמונות ל-Supabase Storage
- 💬 מערכת תגובות למודעות
- 🔧 פאנל ניהול למנהלים
- 🔄 עדכונים בזמן אמת עם Supabase Realtime
- 🌙 עיצוב מודרני עם gradients כחולים
- 📱 ממשק מותאם לנייד

## 🚀 התקנה מקומית

```bash
# שכפול הפרויקט
git clone <YOUR_GIT_URL>
cd schooltrade

# התקנת תלויות
npm install

# הרצה בסביבת פיתוח
npm run dev
```

## 🗄️ הגדרת Supabase

### 1. יצירת טבלאות

הפעל את ה-SQL הבא בפרויקט Supabase שלך:

```sql
-- יצירת טבלת משתמשים
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- הפעלת RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- מדיניות צפייה
CREATE POLICY "Users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- מדיניות רישום
CREATE POLICY "Anyone can register"
  ON public.users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- יצירת טבלת מודעות
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_code text NOT NULL,
  owner_name text NOT NULL,
  description text NOT NULL,
  price text NOT NULL,
  photo_path text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  comments jsonb DEFAULT '[]'::jsonb
);

-- הפעלת RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- מדיניות צפייה
CREATE POLICY "Anyone can view posts"
  ON public.posts
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- מדיניות יצירה
CREATE POLICY "Anyone can create posts"
  ON public.posts
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- מדיניות עדכון
CREATE POLICY "Anyone can update posts"
  ON public.posts
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- מדיניות מחיקה
CREATE POLICY "Anyone can delete posts"
  ON public.posts
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- יצירת אינדקסים
CREATE INDEX IF NOT EXISTS idx_users_code ON public.users(code);
CREATE INDEX IF NOT EXISTS idx_posts_owner_code ON public.posts(owner_code);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
```

### 2. יצירת Storage Bucket

```sql
-- יצירת bucket לתמונות
INSERT INTO storage.buckets (id, name, public)
VALUES ('schooltrade-photos', 'schooltrade-photos', true)
ON CONFLICT (id) DO NOTHING;

-- מדיניות Storage
CREATE POLICY "Anyone can view photos"
  ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'schooltrade-photos');

CREATE POLICY "Anyone can upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'schooltrade-photos');

CREATE POLICY "Anyone can delete photos"
  ON storage.objects
  FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'schooltrade-photos');
```

### 3. הפעלת Realtime (אופציונלי)

```sql
-- הפעלת עדכונים בזמן אמת
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
```

## 🔐 הגדרת משתני סביבה (לפרודקשן)

אם אתה מפרסם את האפליקציה, ודא שמוגדרים משתני הסביבה הבאים:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

⚠️ **אזהרת אבטחה**: אל תשמור את מפתח ה-ANON בקוד! השתמש במשתני סביבה או ב-Secrets של הפלטפורמה בה אתה מפרסם.

## 👨‍💼 קודי מנהל

המערכת מזהה את הקודים הבאים כמנהלים:
- `admin`
- `michaelrodov`

מנהלים יכולים למחוק כל משתמש וכל מודעה.

## 📦 פרסום

### GitHub Pages / Netlify

```bash
# בניית הפרויקט
npm run build

# התיקייה dist/ מוכנה לפרסום
```

להעלאה ל-GitHub Pages:
1. צור repository ב-GitHub
2. דחוף את הקוד
3. הפעל GitHub Actions או העלה את התיקייה `dist/` ידנית

להעלאה ל-Netlify:
1. התחבר ל-Netlify
2. גרור את תיקיית `dist/` או חבר את ה-GitHub repository
3. הגדר משתני סביבה בהגדרות Netlify

### Lovable

הפרויקט כבר מחובר ל-Lovable Cloud ומוכן לפרסום ישירות דרך Lovable:
1. לחץ על "Publish" בממשק Lovable
2. האתר יהיה זמין תוך דקות

## 🧪 רשימת בדיקות

- [ ] רישום משתמש חדש והצגת קוד בן 9 ספרות
- [ ] התחברות עם קוד קיים
- [ ] צילום תמונה והעלאתה
- [ ] יצירת מודעה עם תיאור ומחיר
- [ ] הוספת תגובות למודעות
- [ ] מחיקת מודעה (בעלים או מנהל)
- [ ] מחיקת משתמש (מנהל בלבד)
- [ ] עדכונים בזמן אמת של מודעות

## 🔒 המלצות אבטחה

### Row Level Security (RLS)

כרגע, המערכת מאפשרת גישה פתוחה למודעות (לא דורשת התחברות). אם ברצונך להגביל את הגישה רק למשתמשים מחוברים, עדכן את מדיניות ה-RLS:

```sql
-- דוגמה: הגבלת יצירת מודעות רק למשתמשים רשומים
DROP POLICY "Anyone can create posts" ON public.posts;

CREATE POLICY "Only registered users can create posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE code = owner_code
    )
  );
```

### פעולות מנהל

לאבטחה מיטבית, פעולות מנהל (מחיקת משתמשים) צריכות להיות מוגדרות כ-Edge Functions עם אימות server-side, ולא דרך מפתח ANON.

## 🛠️ טכנולוגיות

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

## 📄 רישיון

MIT License - ראה קובץ LICENSE לפרטים נוספים.

---

נבנה עם ❤️ על ידי Lovable
