# 🛡️ מערכת אבטחת מידע מתקדמת - SchoolTrade

## סקירה כללית

מערכת זו מיושמת עם שכבות אבטחה מרובות ברמת אפליקציה. חלק מתכונות האבטחה דורשות תשתית חיצונית (CDN, שרתים) שאינה זמינה בסביבת Lovable.

---

## ✅ מה מיושם (רמת אפליקציה)

### 1. **בקרת גישה מבוססת תפקידים (RBAC)**
- **טבלת תפקידים נפרדת**: תפקידים מאוחסנים ב-`user_roles` ולא בטבלת המשתמשים (מניעת privilege escalation)
- **פונקציית אימות מאובטחת**: `has_role()` עם SECURITY DEFINER למניעת רקורסיה ב-RLS
- **תפקידים זמינים**: admin, moderator, user
- **מנהל ברירת מחדל**: קוד 468786933

**איך לבדוק:**
```sql
-- בדיקת תפקיד משתמש
SELECT has_role('468786933', 'admin');

-- הוספת תפקיד מנהל למשתמש
INSERT INTO user_roles (user_code, role, granted_by)
VALUES ('XXXXXXXXX', 'admin', '468786933');
```

### 2. **סינון תוכן אוטומטי (Content Filtering)**

**Edge Function**: `content-filter`

**רשימות חסימה:**
- ניבולי פה (עברית + אנגלית)
- דיבור שנאה ואיומים
- תוכן מיני / NSFW
- ספאם ומילות מפתח להונאה

**רמות חומרה:**
- **Critical**: דיבור שנאה, איומים → **חסימה מיידית**
- **High**: תוכן מיני → **חסימה מיידית**
- **Medium**: ניבולי פה → **צנזורה אוטומטית** (החלפה ב-***)
- **Low**: ספאם → **חסימה מיידית**

**זיהוי מתקדם:**
- Fuzzy matching (זיהוי וריאציות)
- Unicode normalization (זיהוי תווים מוסווים)
- Leetspeak detection (a->@, e->3, וכו')
- זיהוי אותיות חוזרות (aaaa → aa)

**שימוש בקוד:**
```typescript
import { filterContent } from '@/lib/security';

const result = await filterContent(
  userInput,
  'post', // or 'comment', 'chat', 'name'
  userCode
);

if (!result.allowed) {
  // תוכן נחסם
  toast({ title: result.message, variant: 'destructive' });
} else if (result.processedContent) {
  // תוכן עבר צנזורה
  content = result.processedContent;
}
```

### 3. **הגבלת קצב (Rate Limiting)**

**פונקציה**: `check_rate_limit()`

**הגבלות ברירת מחדל:**
- 60 בקשות לדקה לכל פעולה
- חסימה אוטומטית ל-15 דקות בעת חריגה
- מעקב לפי user_code או IP

**שימוש בקוד:**
```typescript
import { checkRateLimit } from '@/lib/security';

const allowed = await checkRateLimit(
  userCode,        // מזהה
  'create_post',   // סוג פעולה
  10,              // מקסימום בקשות
  5                // חלון זמן בדקות
);

if (!allowed) {
  toast({ 
    title: 'יותר מדי בקשות',
    description: 'אנא נסה שוב בעוד מספר דקות',
    variant: 'destructive'
  });
  return;
}
```

**התאמת הגבלות:**
```sql
-- שינוי זמן חסימה (טבלת rate_limits)
UPDATE rate_limits 
SET blocked_until = now() + interval '30 minutes'
WHERE identifier = 'USER_CODE';

-- איפוס מונה
DELETE FROM rate_limits 
WHERE identifier = 'USER_CODE' AND action_type = 'SPECIFIC_ACTION';
```

### 4. **לוגים ומעקב אבטחה**

**טבלת `security_logs`:**
- כל אירועי אבטחה
- רמות חומרה: info, warning, critical
- פרטים: IP, user agent, מידע נוסף

**טבלת `content_violations`:**
- כל הפרות תוכן שנחסמו
- תוכן מקורי + סיבת חסימה
- מעקב אחר משתמשים חוזרים

**גישה ללוגים:**
- דף "אבטחה" בממשק המנהל
- 3 לשוניות: לוגי אבטחה, הפרות תוכן, הגבלות קצב
- סינון לפי חומרה ותאריך

**שימוש בקוד:**
```typescript
import { logSecurityEvent } from '@/lib/security';

await logSecurityEvent(
  'suspicious_login',     // סוג אירוע
  'warning',              // חומרה
  userCode,               // קוד משתמש
  { reason: 'Multiple failed attempts', ip: '1.2.3.4' }
);
```

### 5. **אימות קלט (Input Validation)**

**פונקציות זמינות:**

```typescript
import { 
  sanitizeInput,      // ניקוי קלט מתווים מסוכנים
  escapeHtml,         // מניעת XSS
  isValidEmail,       // בדיקת אימייל
  isValidCode,        // בדיקת קוד (9 ספרות)
  isStrongPassword    // בדיקת סיסמה חזקה
} from '@/lib/security';

// דוגמה
const clean = sanitizeInput(userInput);
const safe = escapeHtml(displayText);

const passwordCheck = isStrongPassword('MyPass123!');
if (!passwordCheck.valid) {
  toast({ title: passwordCheck.message });
}
```

**כללי סניטציה:**
- הסרת תווים מסוכנים: `< > { } [ ]`
- נורמליזציה של Unicode
- הגבלת אורך (10,000 תווים)
- HTML escaping לכל תוכן שמוצג

### 6. **כותרות אבטחה (Security Headers)**

**קובץ**: `src/lib/securityHeaders.ts`

**כותרות מיושמות:**
- **Content-Security-Policy (CSP)**: הגנה מפני XSS
- **X-Frame-Options**: מניעת clickjacking
- **X-Content-Type-Options**: מניעת MIME sniffing
- **Referrer-Policy**: הגנת פרטיות
- **Strict-Transport-Security (HSTS)**: אכיפת HTTPS

**הערה**: כותרות אלו מיושמות ברמת meta tags. לסביבת ייצור, יש להגדיר גם ברמת CDN/שרת.

### 7. **Row Level Security (RLS)**

כל הטבלאות מוגנות עם RLS policies:

**טבלאות מאובטחות:**
- `users`: קריאה לכולם, כתיבה רק בהרשמה
- `posts`: גישה מלאה (פומבי)
- `comments`: גישה מלאה (פומבי)
- `user_roles`: רק מנהלים יכולים לשנות
- `security_logs`: רק מנהלים יכולים לראות
- `content_violations`: רק מנהלים יכולים לראות
- `rate_limits`: משתמשים רואים רק את שלהם
- `private_chats`: רק משתתפי הצ'אט
- `private_messages`: רק משתתפי הצ'אט

---

## ⚠️ מה לא מיושם (דורש תשתית)

### מגבלות פלטפורמה

הדברים הבאים **לא ניתנים ליישום** בסביבת Lovable ודורשים תשתית חיצונית:

1. **CDN/Cloudflare WAF** - דורש הגדרת DNS וחשבון Cloudflare
2. **הגנת DDoS ברמת רשת** - דורש תשתית רשת
3. **חסימת IP ברמת רשת** - דורש שרת/proxy
4. **Geo-fencing** - דורש CDN
5. **IP allowlist למנהלים** - דורש תצורת רשת
6. **אישורי TLS לקליינט** - דורש תשתית PKI
7. **SIEM logging** - דורש שירות חיצוני
8. **MFA/2FA** - Supabase Auth תומך אבל דורש הגדרה
9. **Penetration testing** - דורש כלים חיצוניים

### המלצות לייצור

כאשר תעבור לסביבת ייצור, **הוסף**:

1. **Cloudflare** (או CDN אחר):
   - הפעל WAF
   - הגדר rate limiting ברמת CDN
   - הוסף Bot Management
   - הפעל "I'm Under Attack Mode" במצב חירום

2. **תשתית מנוהלת**:
   - שרתים מוקשחים
   - Firewall ברמת רשת
   - VPN למנהלים
   - Load balancer עם הגנת DDoS

3. **ניטור**:
   - שירות SIEM (Datadog, Splunk, ELK)
   - התראות בזמן אמת
   - Dashboard ניטור

4. **בדיקות**:
   - Vulnerability scanning שבועי
   - Penetration testing חודשי
   - Code audits רבעוניים

---

## 📋 מדריך שימוש למנהלים

### גישה לממשק האבטחה

1. התחבר עם חשבון מנהל (קוד: 468786933)
2. לחץ על כפתור "🛡️ אבטחה" בתפריט העליון
3. בחר לשונית לפי סוג המידע:
   - **לוגי אבטחה**: כל אירועי האבטחה
   - **הפרות תוכן**: תכנים שנחסמו
   - **הגבלות קצב**: משתמשים עם הגבלה

### ניהול הפרות

**צפייה בהפרה:**
```
חומרה: critical
סוג: post
משתמש: 123456789
סיבה: Hate speech detected: [words]
תאריך: 01/12/2025 14:30
```

**פעולות אפשריות:**

1. **חסימת משתמש ידנית:**
```sql
-- חסימה לזמן מוגבל
UPDATE rate_limits
SET blocked_until = now() + interval '7 days'
WHERE identifier = 'USER_CODE';

-- חסימה קבועה
UPDATE users
SET role = 'blocked'
WHERE code = 'USER_CODE';
```

2. **הסרת חסימה:**
```sql
DELETE FROM rate_limits
WHERE identifier = 'USER_CODE';
```

3. **מחיקת הפרות ישנות:**
```sql
DELETE FROM content_violations
WHERE created_at < now() - interval '90 days';
```

### ניהול תפקידים

**הוספת מנהל:**
```sql
INSERT INTO user_roles (user_code, role, granted_by)
VALUES ('NEW_ADMIN_CODE', 'admin', 'YOUR_CODE');
```

**הורדת מנהל:**
```sql
DELETE FROM user_roles
WHERE user_code = 'ADMIN_CODE' AND role = 'admin';
```

**רשימת כל המנהלים:**
```sql
SELECT u.name, u.code, ur.granted_at, ur.granted_by
FROM users u
JOIN user_roles ur ON u.code = ur.user_code
WHERE ur.role = 'admin';
```

### עדכון רשימת מילים אסורות

**קובץ**: `supabase/functions/content-filter/index.ts`

**הוספת מילים:**
```typescript
const PROFANITY_WORDS = [
  // ... רשימה קיימת
  'new_bad_word',
  'מילה חדשה'
];
```

**לאחר שינוי** - הפונקציה תעודכן אוטומטית בפריסה הבאה.

### ניטור בזמן אמת

**שאילתות שימושיות:**

```sql
-- הפרות ב-24 שעות האחרונות
SELECT COUNT(*), severity
FROM content_violations
WHERE created_at > now() - interval '24 hours'
GROUP BY severity;

-- משתמשים חסומים כרגע
SELECT identifier, action_type, blocked_until
FROM rate_limits
WHERE blocked_until > now();

-- 10 אירועי האבטחה האחרונים
SELECT event_type, severity, user_code, created_at
FROM security_logs
ORDER BY created_at DESC
LIMIT 10;

-- משתמשים עם הפרות חוזרות
SELECT user_code, COUNT(*) as violations
FROM content_violations
WHERE created_at > now() - interval '30 days'
GROUP BY user_code
HAVING COUNT(*) > 5
ORDER BY violations DESC;
```

---

## 🔧 תחזוקה

### ניקוי לוגים ישנים

```sql
-- מחיקת לוגים מעל 90 יום
DELETE FROM security_logs
WHERE created_at < now() - interval '90 days';

-- מחיקת הפרות מעל 180 יום
DELETE FROM content_violations
WHERE created_at < now() - interval '180 days';

-- איפוס הגבלות שפג תוקפן
DELETE FROM rate_limits
WHERE blocked_until < now();
```

### ביצועים

**אינדקסים קיימים:**
- `security_logs`: created_at, severity
- `content_violations`: created_at
- `rate_limits`: identifier, blocked_until

**אופטימיזציה:**
```sql
-- Vacuum tables monthly
VACUUM ANALYZE security_logs;
VACUUM ANALYZE content_violations;
VACUUM ANALYZE rate_limits;
```

---

## 🚨 תגובה לאירועים

### מתקפת DDoS

1. **זיהוי**: עלייה פתאומית ב-rate_limits
2. **תגובה מיידית**:
   - הגבל הגבלות קצב לכל המשתמשים
   - הפעל מצב תחזוקה
3. **תגובה ארוכת טווח**:
   - הוסף הגנת CDN (Cloudflare)
   - בדוק לוגים לזיהוי מקור

### הפרות תוכן מאסיביות

1. **זיהוי**: עלייה ב-content_violations
2. **תגובה**:
   - חסום משתמש אוטומטית
   - בדוק אם זה בוט
   - עדכן רשימת מילים אסורות

### ניסיון פריצה

1. **זיהוי**: ניסיונות התחברות כושלים רבים
2. **תגובה**:
   - חסום IP אוטומטית
   - בדוק security_logs
   - שנה סיסמת מנהל

---

## 📚 משאבים נוספים

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 📞 תמיכה

לשאלות או בעיות אבטחה:
1. בדוק את לוגי האבטחה בממשק המנהל
2. עיין ב-SECURITY.md זה
3. פנה לתמיכה טכנית

**עדכון אחרון**: דצמבר 2025