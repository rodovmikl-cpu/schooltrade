import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Puzzle {
  question: string;
  hint: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard" | "elite";
  category: "logic" | "crypto" | "hacker" | "code" | "pattern";
  points: number;
  timeLimit: number;
}

// ========== 50 EASY ==========
const EASY_PUZZLES: Puzzle[] = [
  { question: "כמה זה 7 × 8?", hint: "חשוב על 56", answer: "56", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "2, 4, 6, 8, ?", hint: "הוסף 2", answer: "10", difficulty: "easy", category: "pattern", points: 20, timeLimit: 15 },
  { question: "כמה זה 100 ÷ 4?", hint: "רבע של 100", answer: "25", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "1, 3, 5, 7, ?", hint: "מספרים אי-זוגיים", answer: "9", difficulty: "easy", category: "pattern", points: 20, timeLimit: 15 },
  { question: "כמה זה 15 + 27?", hint: "חבר", answer: "42", difficulty: "easy", category: "logic", points: 15, timeLimit: 15 },
  { question: "כמה אפסים ב-1000?", hint: "ספור", answer: "3", difficulty: "easy", category: "logic", points: 15, timeLimit: 10 },
  { question: "10, 20, 30, ?", hint: "הוסף 10", answer: "40", difficulty: "easy", category: "pattern", points: 15, timeLimit: 10 },
  { question: "כמה זה 9 × 9?", hint: "81", answer: "81", difficulty: "easy", category: "logic", points: 20, timeLimit: 12 },
  { question: "כמה דקות בשעה?", hint: "60", answer: "60", difficulty: "easy", category: "logic", points: 10, timeLimit: 10 },
  { question: "כמה ימים בשבוע?", hint: "7", answer: "7", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "5, 10, 15, 20, ?", hint: "כפולות של 5", answer: "25", difficulty: "easy", category: "pattern", points: 15, timeLimit: 10 },
  { question: "כמה זה 144 ÷ 12?", hint: "שורש של 144", answer: "12", difficulty: "easy", category: "logic", points: 25, timeLimit: 15 },
  { question: "כמה שניות בדקה?", hint: "60", answer: "60", difficulty: "easy", category: "logic", points: 10, timeLimit: 10 },
  { question: "3 × 3 × 3 = ?", hint: "27", answer: "27", difficulty: "easy", category: "logic", points: 20, timeLimit: 12 },
  { question: "1 + 2 + 3 + 4 + 5 = ?", hint: "סכום", answer: "15", difficulty: "easy", category: "logic", points: 15, timeLimit: 15 },
  { question: "כמה צלעות למשולש?", hint: "3", answer: "3", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "כמה זה 50% של 200?", hint: "חצי", answer: "100", difficulty: "easy", category: "logic", points: 20, timeLimit: 12 },
  { question: "2, 4, 8, 16, ?", hint: "כפול 2", answer: "32", difficulty: "easy", category: "pattern", points: 25, timeLimit: 15 },
  { question: "כמה זה 1000 - 777?", hint: "חסר", answer: "223", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "כמה חודשים בשנה?", hint: "12", answer: "12", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "100, 90, 80, 70, ?", hint: "חסר 10", answer: "60", difficulty: "easy", category: "pattern", points: 15, timeLimit: 10 },
  { question: "כמה זה 25 × 4?", hint: "100", answer: "100", difficulty: "easy", category: "logic", points: 15, timeLimit: 12 },
  { question: "1, 4, 9, 16, ?", hint: "ריבועים", answer: "25", difficulty: "easy", category: "pattern", points: 25, timeLimit: 15 },
  { question: "כמה פינות לריבוע?", hint: "4", answer: "4", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "כמה זה 11 × 11?", hint: "121", answer: "121", difficulty: "easy", category: "logic", points: 20, timeLimit: 12 },
  { question: "כמה ס\"מ במטר?", hint: "100", answer: "100", difficulty: "easy", category: "logic", points: 10, timeLimit: 10 },
  { question: "3, 6, 9, 12, ?", hint: "כפולות 3", answer: "15", difficulty: "easy", category: "pattern", points: 15, timeLimit: 10 },
  { question: "כמה שעות ביום?", hint: "24", answer: "24", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "כמה זה 13 + 18?", hint: "חבר", answer: "31", difficulty: "easy", category: "logic", points: 15, timeLimit: 12 },
  { question: "כמה גרם בקילו?", hint: "1000", answer: "1000", difficulty: "easy", category: "logic", points: 10, timeLimit: 10 },
  { question: "1, 1, 2, 3, 5, ?", hint: "פיבונאצ'י", answer: "8", difficulty: "easy", category: "pattern", points: 30, timeLimit: 20 },
  { question: "כמה זה 6!?", hint: "6 עצרת", answer: "720", difficulty: "easy", category: "logic", points: 30, timeLimit: 20 },
  { question: "מה מספר האותיות ב-HELLO?", hint: "ספור", answer: "5", difficulty: "easy", category: "code", points: 10, timeLimit: 10 },
  { question: "10, 7, 4, 1, ?", hint: "חסר 3", answer: "-2", difficulty: "easy", category: "pattern", points: 25, timeLimit: 15 },
  { question: "כמה זה √49?", hint: "שורש", answer: "7", difficulty: "easy", category: "logic", points: 15, timeLimit: 10 },
  { question: "כמה צלעות למשושה?", hint: "6", answer: "6", difficulty: "easy", category: "logic", points: 15, timeLimit: 10 },
  { question: "0.5 × 100 = ?", hint: "חצי", answer: "50", difficulty: "easy", category: "logic", points: 15, timeLimit: 10 },
  { question: "כמה זה 2^5?", hint: "חזקה", answer: "32", difficulty: "easy", category: "logic", points: 25, timeLimit: 15 },
  { question: "כמה מ\"מ ב-1 ס\"מ?", hint: "10", answer: "10", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "64, 32, 16, 8, ?", hint: "חלק ב-2", answer: "4", difficulty: "easy", category: "pattern", points: 20, timeLimit: 12 },
  { question: "כמה זה 99 + 1?", hint: "100", answer: "100", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "כמה זה 1/4 של 80?", hint: "רבע", answer: "20", difficulty: "easy", category: "logic", points: 20, timeLimit: 12 },
  { question: "כמה זוויות למשולש?", hint: "3", answer: "3", difficulty: "easy", category: "logic", points: 10, timeLimit: 8 },
  { question: "7, 14, 21, 28, ?", hint: "כפולות 7", answer: "35", difficulty: "easy", category: "pattern", points: 15, timeLimit: 10 },
  { question: "כמה זה 200 ÷ 8?", hint: "חלק", answer: "25", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "1+1 בבינארי = ?", hint: "לא 2", answer: "10", difficulty: "easy", category: "hacker", points: 25, timeLimit: 15 },
  { question: "כמה זה 5²?", hint: "חזקה", answer: "25", difficulty: "easy", category: "logic", points: 15, timeLimit: 10 },
  { question: "כמה ליטר בגלון?", hint: "~3.78", answer: "3.78", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "1000 ÷ 50 = ?", hint: "חלק", answer: "20", difficulty: "easy", category: "logic", points: 15, timeLimit: 12 },
  { question: "4, 16, 64, 256, ?", hint: "כפול 4", answer: "1024", difficulty: "easy", category: "pattern", points: 25, timeLimit: 15 },
];

// ========== 50 MEDIUM ==========
const MEDIUM_PUZZLES: Puzzle[] = [
  { question: "אם 2+3=10, 7+2=63, 6+5=66, 8+4=?", hint: "כפל ואז חיבור", answer: "96", difficulty: "medium", category: "logic", points: 50, timeLimit: 40 },
  { question: "יש לי 6 פנים, 21 עיניים. מה אני?", hint: "משחק שולחן", answer: "קוביה", difficulty: "medium", category: "logic", points: 50, timeLimit: 40 },
  { question: "√(144) × √(25) = ?", hint: "שורשים", answer: "60", difficulty: "medium", category: "logic", points: 45, timeLimit: 30 },
  { question: "3, 5, 8, 13, 21, ?", hint: "סדרה מפורסמת", answer: "34", difficulty: "medium", category: "pattern", points: 50, timeLimit: 30 },
  { question: "1=A, 2=B... 8-5-12-12-15?", hint: "מילה", answer: "HELLO", difficulty: "medium", category: "code", points: 55, timeLimit: 45 },
  { question: "מי יצר את ביטקוין? (שם משפחה)", hint: "יפני", answer: "נקמוטו", difficulty: "medium", category: "crypto", points: 50, timeLimit: 30 },
  { question: "כמה זה 17² - 15²?", hint: "(a+b)(a-b)", answer: "64", difficulty: "medium", category: "logic", points: 50, timeLimit: 35 },
  { question: "2, 6, 12, 20, 30, ?", hint: "n(n+1)", answer: "42", difficulty: "medium", category: "pattern", points: 55, timeLimit: 35 },
  { question: "בבסיס 16, מה זה FF?", hint: "הקסדצימלי", answer: "255", difficulty: "medium", category: "hacker", points: 60, timeLimit: 40 },
  { question: "אם x + 5 = 12, מה x?", hint: "חסר 5", answer: "7", difficulty: "medium", category: "logic", points: 35, timeLimit: 20 },
  { question: "כמה זה 3^4?", hint: "חזקה", answer: "81", difficulty: "medium", category: "logic", points: 40, timeLimit: 25 },
  { question: "1, 8, 27, 64, ?", hint: "חזקות שלישיות", answer: "125", difficulty: "medium", category: "pattern", points: 55, timeLimit: 30 },
  { question: "כמה אלכסונים למשושה?", hint: "n(n-3)/2", answer: "9", difficulty: "medium", category: "logic", points: 50, timeLimit: 35 },
  { question: "31, 28, 31, 30, ?", hint: "ימים בחודשים", answer: "31", difficulty: "medium", category: "pattern", points: 40, timeLimit: 25 },
  { question: "בבסיס 2, מה זה 1010?", hint: "בינארי לעשרוני", answer: "10", difficulty: "medium", category: "hacker", points: 55, timeLimit: 35 },
  { question: "20% של 250 = ?", hint: "אחוזים", answer: "50", difficulty: "medium", category: "logic", points: 35, timeLimit: 20 },
  { question: "2, 3, 5, 7, 11, 13, ?", hint: "ראשוניים", answer: "17", difficulty: "medium", category: "pattern", points: 45, timeLimit: 25 },
  { question: "log₁₀(1000) = ?", hint: "לוגריתם", answer: "3", difficulty: "medium", category: "logic", points: 50, timeLimit: 30 },
  { question: "כמה ביטים בבייט?", hint: "יחידת מחשב", answer: "8", difficulty: "medium", category: "hacker", points: 35, timeLimit: 15 },
  { question: "0, 1, 1, 2, 3, 5, 8, 13, ?", hint: "פיבונאצ'י", answer: "21", difficulty: "medium", category: "pattern", points: 40, timeLimit: 20 },
  { question: "אם 3x = 24, מה x?", hint: "חלק ב-3", answer: "8", difficulty: "medium", category: "logic", points: 35, timeLimit: 20 },
  { question: "כמה צלעות ל-12-צלעון?", hint: "דודקגון", answer: "12", difficulty: "medium", category: "logic", points: 30, timeLimit: 15 },
  { question: "121 הוא שורש של?", hint: "11²", answer: "11", difficulty: "medium", category: "logic", points: 40, timeLimit: 20 },
  { question: "מה שם מטבע הקריפטו השני?", hint: "ETH", answer: "אתריום", difficulty: "medium", category: "crypto", points: 45, timeLimit: 30 },
  { question: "256 בבסיס 2 זה כמה ספרות?", hint: "2^8", answer: "9", difficulty: "medium", category: "hacker", points: 55, timeLimit: 35 },
  { question: "5! ÷ 3! = ?", hint: "עצרות", answer: "20", difficulty: "medium", category: "logic", points: 50, timeLimit: 30 },
  { question: "1, 4, 27, 256, ?", hint: "n^n", answer: "3125", difficulty: "medium", category: "pattern", points: 60, timeLimit: 40 },
  { question: "HTTP פועל על פורט?", hint: "80", answer: "80", difficulty: "medium", category: "hacker", points: 40, timeLimit: 20 },
  { question: "כמה זה 15% של 600?", hint: "אחוזים", answer: "90", difficulty: "medium", category: "logic", points: 40, timeLimit: 25 },
  { question: "A=1...Z=26, מה סכום MATH?", hint: "חבר ערכים", answer: "42", difficulty: "medium", category: "code", points: 55, timeLimit: 45 },
  { question: "כמה מספרים ראשוניים עד 20?", hint: "ספור ראשוניים", answer: "8", difficulty: "medium", category: "logic", points: 50, timeLimit: 35 },
  { question: "2^10 = ?", hint: "חזקה", answer: "1024", difficulty: "medium", category: "logic", points: 40, timeLimit: 20 },
  { question: "מה Satoshi ביחס לביטקוין?", hint: "היחידה הקטנה", answer: "0.00000001", difficulty: "medium", category: "crypto", points: 55, timeLimit: 40 },
  { question: "4, 9, 16, 25, 36, ?", hint: "ריבועים", answer: "49", difficulty: "medium", category: "pattern", points: 35, timeLimit: 20 },
  { question: "HTTPS פועל על פורט?", hint: "443", answer: "443", difficulty: "medium", category: "hacker", points: 40, timeLimit: 20 },
  { question: "כמה זה 7! ÷ 5!?", hint: "7×6", answer: "42", difficulty: "medium", category: "logic", points: 45, timeLimit: 25 },
  { question: "מהי שנת יצירת ביטקוין?", hint: "2009", answer: "2009", difficulty: "medium", category: "crypto", points: 40, timeLimit: 20 },
  { question: "1, 2, 4, 7, 11, ?", hint: "+1,+2,+3,+4...", answer: "16", difficulty: "medium", category: "pattern", points: 45, timeLimit: 25 },
  { question: "C בהקסדצימלי = ?", hint: "12", answer: "12", difficulty: "medium", category: "hacker", points: 40, timeLimit: 20 },
  { question: "√(169) = ?", hint: "שורש", answer: "13", difficulty: "medium", category: "logic", points: 35, timeLimit: 15 },
  { question: "SSH פועל על פורט?", hint: "22", answer: "22", difficulty: "medium", category: "hacker", points: 40, timeLimit: 20 },
  { question: "6, 12, 24, 48, ?", hint: "×2", answer: "96", difficulty: "medium", category: "pattern", points: 35, timeLimit: 20 },
  { question: "2+2=4, 3+3=18, 4+4=?", hint: "n+n ×n", answer: "32", difficulty: "medium", category: "logic", points: 55, timeLimit: 40 },
  { question: "כמה זה π מעוגל ל-2 ספרות?", hint: "3.14", answer: "3.14", difficulty: "medium", category: "logic", points: 30, timeLimit: 15 },
  { question: "DNS פועל על פורט?", hint: "53", answer: "53", difficulty: "medium", category: "hacker", points: 45, timeLimit: 25 },
  { question: "1, 3, 6, 10, 15, ?", hint: "מספרים משולשיים", answer: "21", difficulty: "medium", category: "pattern", points: 45, timeLimit: 25 },
  { question: "כמה מדינות בעולם (בערך)?", hint: "~195", answer: "195", difficulty: "medium", category: "logic", points: 40, timeLimit: 30 },
  { question: "מה סוג ההצפנה בביטקוין?", hint: "SHA", answer: "SHA-256", difficulty: "medium", category: "crypto", points: 55, timeLimit: 35 },
  { question: "11 × 12 × 0 + 5 = ?", hint: "כפול 0", answer: "5", difficulty: "medium", category: "logic", points: 30, timeLimit: 15 },
  { question: "FTP פועל על פורט?", hint: "21", answer: "21", difficulty: "medium", category: "hacker", points: 40, timeLimit: 20 },
];

// ========== 50 HARD ==========
const HARD_PUZZLES: Puzzle[] = [
  { question: "מה מגיע פעם בדקה, פעמיים ברגע, ולא באלף שנים?", hint: "אותיות", answer: "ר", difficulty: "hard", category: "logic", points: 80, timeLimit: 60 },
  { question: "ROT13: 'URYYB' = ?", hint: "הזז 13", answer: "HELLO", difficulty: "hard", category: "hacker", points: 90, timeLimit: 50 },
  { question: "1, 1, 2, 3, 5, 8, 13, 21, 34, ?", hint: "פיבונאצ'י", answer: "55", difficulty: "hard", category: "pattern", points: 70, timeLimit: 30 },
  { question: "A=1... LEMON = ?", hint: "סכום ערכים", answer: "54", difficulty: "hard", category: "code", points: 100, timeLimit: 60 },
  { question: "x² = 169, x > 0. מה x?", hint: "שורש", answer: "13", difficulty: "hard", category: "logic", points: 70, timeLimit: 30 },
  { question: "בלוקצ'יין נקרא גם?", hint: "שרשרת", answer: "שרשרת בלוקים", difficulty: "hard", category: "crypto", points: 75, timeLimit: 40 },
  { question: "0x1A בעשרוני = ?", hint: "הקסדצימלי", answer: "26", difficulty: "hard", category: "hacker", points: 80, timeLimit: 40 },
  { question: "∑(i=1 to 10) i = ?", hint: "סכום 1 עד 10", answer: "55", difficulty: "hard", category: "logic", points: 75, timeLimit: 35 },
  { question: "2, 6, 14, 30, 62, ?", hint: "×2+2", answer: "126", difficulty: "hard", category: "pattern", points: 90, timeLimit: 45 },
  { question: "כמה זה 13 × 17?", hint: "חשב", answer: "221", difficulty: "hard", category: "logic", points: 70, timeLimit: 30 },
  { question: "בבסיס 8, מה זה 77?", hint: "אוקטלי", answer: "63", difficulty: "hard", category: "hacker", points: 85, timeLimit: 45 },
  { question: "x² - 7x + 12 = 0. מה x הגדול?", hint: "פירוק", answer: "4", difficulty: "hard", category: "logic", points: 90, timeLimit: 50 },
  { question: "מהי פונקציית Hash?", hint: "חד-כיוונית", answer: "פונקציה חד כיוונית", difficulty: "hard", category: "crypto", points: 80, timeLimit: 45 },
  { question: "1, 2, 6, 24, 120, ?", hint: "עצרות", answer: "720", difficulty: "hard", category: "pattern", points: 80, timeLimit: 35 },
  { question: "TCP פועל בשכבה?", hint: "Transport", answer: "4", difficulty: "hard", category: "hacker", points: 75, timeLimit: 30 },
  { question: "√(2) מעוגל ל-2 ספרות = ?", hint: "שורש 2", answer: "1.41", difficulty: "hard", category: "logic", points: 70, timeLimit: 25 },
  { question: "Caesar cipher: 'KHOOR' shift=3 → ?", hint: "הזז אחורה", answer: "HELLO", difficulty: "hard", category: "code", points: 100, timeLimit: 60 },
  { question: "כמה ראשוניים תאומים עד 50?", hint: "(p, p+2)", answer: "5", difficulty: "hard", category: "logic", points: 90, timeLimit: 60 },
  { question: "מה SHA ב-SHA-256?", hint: "Secure Hash", answer: "Secure Hash Algorithm", difficulty: "hard", category: "hacker", points: 85, timeLimit: 45 },
  { question: "3, 9, 27, 81, ?", hint: "×3", answer: "243", difficulty: "hard", category: "pattern", points: 70, timeLimit: 25 },
  { question: "log₂(256) = ?", hint: "חזקת 2", answer: "8", difficulty: "hard", category: "logic", points: 70, timeLimit: 25 },
  { question: "IP address הוא כמה ביטים? (IPv4)", hint: "32", answer: "32", difficulty: "hard", category: "hacker", points: 70, timeLimit: 20 },
  { question: "מה Market Cap?", hint: "שווי שוק", answer: "שווי שוק", difficulty: "hard", category: "crypto", points: 65, timeLimit: 30 },
  { question: "2^16 = ?", hint: "חזקה", answer: "65536", difficulty: "hard", category: "logic", points: 80, timeLimit: 35 },
  { question: "1, 3, 7, 15, 31, ?", hint: "2^n - 1", answer: "63", difficulty: "hard", category: "pattern", points: 85, timeLimit: 40 },
  { question: "כמה זה e מעוגל ל-2 ספרות?", hint: "אוילר", answer: "2.72", difficulty: "hard", category: "logic", points: 75, timeLimit: 30 },
  { question: "XOR: 1010 ⊕ 1100 = ?", hint: "ביטורי", answer: "0110", difficulty: "hard", category: "hacker", points: 90, timeLimit: 45 },
  { question: "מהו Nonce?", hint: "מספר חד-פעמי", answer: "מספר חד פעמי", difficulty: "hard", category: "crypto", points: 80, timeLimit: 40 },
  { question: "12! ÷ 10! = ?", hint: "12×11", answer: "132", difficulty: "hard", category: "logic", points: 75, timeLimit: 30 },
  { question: "10, 11, 12, 13, 14, 15 בהקסדצימלי = ?", hint: "A-F", answer: "A B C D E F", difficulty: "hard", category: "hacker", points: 85, timeLimit: 40 },
  { question: "מה זה Smart Contract?", hint: "חוזה אוטומטי", answer: "חוזה חכם", difficulty: "hard", category: "crypto", points: 70, timeLimit: 35 },
  { question: "4, 8, 15, 16, 23, ?", hint: "Lost", answer: "42", difficulty: "hard", category: "pattern", points: 80, timeLimit: 40 },
  { question: "כמה זה C(5,2)?", hint: "צירופים", answer: "10", difficulty: "hard", category: "logic", points: 80, timeLimit: 35 },
  { question: "AES הוא סוג של?", hint: "הצפנה", answer: "הצפנה סימטרית", difficulty: "hard", category: "hacker", points: 85, timeLimit: 40 },
  { question: "2x + 5 = 21, מה x?", hint: "פתור", answer: "8", difficulty: "hard", category: "logic", points: 60, timeLimit: 20 },
  { question: "מהו Proof of Work?", hint: "הוכחת עבודה", answer: "הוכחת עבודה", difficulty: "hard", category: "crypto", points: 75, timeLimit: 35 },
  { question: "8, 27, 64, 125, ?", hint: "חזקות 3", answer: "216", difficulty: "hard", category: "pattern", points: 75, timeLimit: 30 },
  { question: "NOT 1010 (4 ביט) = ?", hint: "היפוך", answer: "0101", difficulty: "hard", category: "hacker", points: 80, timeLimit: 35 },
  { question: "GCD(48, 18) = ?", hint: "מחלק משותף", answer: "6", difficulty: "hard", category: "logic", points: 75, timeLimit: 35 },
  { question: "מהו DeFi?", hint: "פיננסים מבוזרים", answer: "פיננסים מבוזרים", difficulty: "hard", category: "crypto", points: 70, timeLimit: 35 },
  { question: "A=1... CODE = ?", hint: "סכום", answer: "27", difficulty: "hard", category: "code", points: 80, timeLimit: 45 },
  { question: "כמה זה C(10,3)?", hint: "צירופים", answer: "120", difficulty: "hard", category: "logic", points: 85, timeLimit: 40 },
  { question: "1, 2, 4, 8, 16, 32, ?", hint: "×2", answer: "64", difficulty: "hard", category: "pattern", points: 60, timeLimit: 20 },
  { question: "RSA הוא סוג של?", hint: "הצפנה", answer: "הצפנה א-סימטרית", difficulty: "hard", category: "hacker", points: 90, timeLimit: 45 },
  { question: "x³ = 343, x = ?", hint: "שורש שלישי", answer: "7", difficulty: "hard", category: "logic", points: 70, timeLimit: 25 },
  { question: "כמה זה φ (יחס הזהב) ל-3 ספרות?", hint: "1.618", answer: "1.618", difficulty: "hard", category: "logic", points: 80, timeLimit: 30 },
  { question: "מהו Gas ב-Ethereum?", hint: "עמלת חישוב", answer: "עמלת חישוב", difficulty: "hard", category: "crypto", points: 75, timeLimit: 35 },
  { question: "AND: 1011 & 1101 = ?", hint: "ביטורי", answer: "1001", difficulty: "hard", category: "hacker", points: 85, timeLimit: 40 },
  { question: "LCM(12, 18) = ?", hint: "כפולה משותפת", answer: "36", difficulty: "hard", category: "logic", points: 75, timeLimit: 30 },
  { question: "1, 4, 9, 16, ?, 36", hint: "ריבועים", answer: "25", difficulty: "hard", category: "pattern", points: 60, timeLimit: 20 },
];

// ========== 10 ELITE ==========
const ELITE_PUZZLES: Puzzle[] = [
  { question: "01001000 01001001 — מה ההודעה?", hint: "ASCII", answer: "HI", difficulty: "elite", category: "hacker", points: 200, timeLimit: 90 },
  { question: "x² - 5x + 6 = 0. מצא x (הגדול)", hint: "פירוק", answer: "3", difficulty: "elite", category: "logic", points: 180, timeLimit: 60 },
  { question: "SHA-256 מפיק כמה ביטים?", hint: "בשם", answer: "256", difficulty: "elite", category: "hacker", points: 160, timeLimit: 30 },
  { question: "∫(0 to 1) x² dx = ?", hint: "אינטגרל", answer: "0.333", difficulty: "elite", category: "logic", points: 250, timeLimit: 90 },
  { question: "lim(x→0) sin(x)/x = ?", hint: "גבול מפורסם", answer: "1", difficulty: "elite", category: "logic", points: 200, timeLimit: 60 },
  { question: "בקוד מורס: .- -... = ?", hint: "אותיות", answer: "AB", difficulty: "elite", category: "hacker", points: 200, timeLimit: 60 },
  { question: "d/dx(x³ + 2x) = ?", hint: "נגזרת", answer: "3x²+2", difficulty: "elite", category: "logic", points: 220, timeLimit: 60 },
  { question: "P(NP) = ? (שאלה פתוחה - רוב חושבים)", hint: "לא שווה", answer: "לא שווה", difficulty: "elite", category: "logic", points: 200, timeLimit: 60 },
  { question: "כמה מפתחות אפשריים ב-AES-256?", hint: "2^256", answer: "2^256", difficulty: "elite", category: "hacker", points: 180, timeLimit: 45 },
  { question: "מה הסיבוכיות של מיון מהיר (ממוצע)?", hint: "Big O", answer: "O(n log n)", difficulty: "elite", category: "logic", points: 220, timeLimit: 60 },
];

const ALL_PUZZLES = [...EASY_PUZZLES, ...MEDIUM_PUZZLES, ...HARD_PUZZLES, ...ELITE_PUZZLES];

// Seeded random for daily/weekly
const getDaySeed = () => { const n = new Date(); return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate(); };
const getWeekSeed = () => { const n = new Date(); const s = new Date(n.getFullYear(), 0, 1); return Math.floor((n.getTime() - s.getTime()) / (7 * 86400000)); };
const seededRand = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

const getDailyPuzzle = (): Puzzle => { const r = seededRand(getDaySeed()); return { ...ALL_PUZZLES[Math.floor(r() * ALL_PUZZLES.length)], points: 100 }; };
const getWeeklyElite = (): Puzzle => { const r = seededRand(getWeekSeed()); return { ...ELITE_PUZZLES[Math.floor(r() * ELITE_PUZZLES.length)], points: 500, timeLimit: 120 }; };

type Difficulty = "easy" | "medium" | "hard" | "elite";
const DIFFICULTIES: { key: Difficulty; label: string; color: string; emoji: string }[] = [
  { key: "easy", label: "קל", color: "text-green-400 border-green-500/40", emoji: "🟢" },
  { key: "medium", label: "בינוני", color: "text-yellow-400 border-yellow-500/40", emoji: "🟡" },
  { key: "hard", label: "קשה", color: "text-orange-400 border-orange-500/40", emoji: "🟠" },
  { key: "elite", label: "עילית", color: "text-red-400 border-red-500/40", emoji: "🔴" },
];

const STORAGE_KEY = "mind-arena-v2";

interface ArenaState {
  totalPoints: number;
  solved: string[];
  badges: string[];
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  fastSolves: number;
}

// Auto-generate replacement puzzle when one is solved
const generatePuzzle = (diff: Difficulty, seed: number): Puzzle => {
  const r = seededRand(seed);
  const a = Math.floor(r() * 50) + 2;
  const b = Math.floor(r() * 50) + 2;
  const ops = [
    { q: `${a} × ${b} = ?`, ans: String(a * b), cat: "logic" as const },
    { q: `${a * b} ÷ ${a} = ?`, ans: String(b), cat: "logic" as const },
    { q: `${a} + ${b} + ${Math.floor(r() * 30)} = ?`, ans: String(a + b + Math.floor(r() * 30)), cat: "logic" as const },
    { q: `${a}² = ?`, ans: String(a * a), cat: "logic" as const },
  ];
  const op = ops[Math.floor(r() * ops.length)];
  const pts = diff === "elite" ? 200 : diff === "hard" ? 80 : diff === "medium" ? 50 : 20;
  const tl = diff === "elite" ? 90 : diff === "hard" ? 45 : diff === "medium" ? 30 : 15;
  return { question: op.q, hint: "חשב", answer: op.ans, difficulty: diff, category: op.cat, points: pts, timeLimit: tl };
};

export const MindArena = () => {
  const [state, setState] = useState<ArenaState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return { totalPoints: p.totalPoints || 0, solved: p.solved || [], badges: p.badges || [], level: p.level || 1, xp: p.xp || 0, xpToNext: p.xpToNext || 200, streak: p.streak || 0, fastSolves: p.fastSolves || 0 };
      } catch { /* */ }
    }
    return { totalPoints: 0, solved: [], badges: [], level: 1, xp: 0, xpToNext: 200, streak: 0, fastSolves: 0 };
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<"menu" | "difficulty" | "playing" | "result">("menu");
  const [showBadge, setShowBadge] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (phase === "playing" && timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { setResult("wrong"); setPhase("result"); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase, timeLeft]);

  useEffect(() => {
    if (showBadge) { const t = setTimeout(() => setShowBadge(null), 3000); return () => clearTimeout(t); }
  }, [showBadge]);

  const addXP = (amount: number, s: ArenaState): ArenaState => {
    let xp = s.xp + amount;
    let level = s.level;
    let xpToNext = s.xpToNext;
    const badges = [...s.badges];
    while (xp >= xpToNext) { xp -= xpToNext; level++; xpToNext = Math.floor(xpToNext * 1.3); playPremiumSound("levelUp"); }
    if (s.solved.length >= 5 && !badges.includes("brain")) { badges.push("brain"); setShowBadge("🧠 מוח חד"); }
    if (s.solved.length >= 20 && !badges.includes("genius")) { badges.push("genius"); setShowBadge("💡 גאון"); }
    if (s.fastSolves >= 10 && !badges.includes("speed")) { badges.push("speed"); setShowBadge("⚡ ברק"); }
    if (level >= 5 && !badges.includes("master")) { badges.push("master"); setShowBadge("👑 מאסטר"); }
    if (s.solved.filter(q => ELITE_PUZZLES.some(p => p.question === q)).length >= 3 && !badges.includes("hacker")) {
      badges.push("hacker"); setShowBadge("💻 האקר");
    }
    return { ...s, xp, level, xpToNext, badges };
  };

  const startPuzzle = (puzzle: Puzzle) => {
    playPremiumSound("gameStart");
    setCurrentPuzzle(puzzle); setAnswer(""); setShowHint(false); setResult(null);
    setTimeLeft(puzzle.timeLimit); setPhase("playing"); setStartTime(Date.now());
  };

  const submitAnswer = () => {
    if (!currentPuzzle) return;
    const isCorrect = answer.trim().toLowerCase() === currentPuzzle.answer.toLowerCase() || answer.trim() === currentPuzzle.answer;
    const timeTaken = (Date.now() - startTime) / 1000;
    const speedBonus = timeTaken < currentPuzzle.timeLimit / 3 ? Math.floor(currentPuzzle.points * 0.5) : 0;
    
    if (isCorrect) {
      playPremiumSound("specialSuccess");
      setResult("correct");
      updateQuestProgress("mindArena", `mindArena-${getDaySeed()}-0`, 1);
      setState(prev => {
        let next = {
          ...prev,
          totalPoints: prev.totalPoints + currentPuzzle.points + speedBonus,
          solved: [...prev.solved, currentPuzzle.question],
          streak: prev.streak + 1,
          fastSolves: timeTaken < currentPuzzle.timeLimit / 3 ? prev.fastSolves + 1 : prev.fastSolves,
        };
        return addXP((currentPuzzle.points + speedBonus) / 3, next);
      });
    } else {
      playSound("error");
      setResult("wrong");
      setState(prev => ({ ...prev, streak: 0 }));
    }
    setPhase("result");
  };

  const getPuzzlesForDifficulty = (d: Difficulty) => {
    const pool = d === "easy" ? EASY_PUZZLES : d === "medium" ? MEDIUM_PUZZLES : d === "hard" ? HARD_PUZZLES : ELITE_PUZZLES;
    const unsolved = pool.filter(p => !state.solved.includes(p.question));
    // Auto-generate replacements if all solved
    if (unsolved.length === 0) {
      const generated: Puzzle[] = [];
      for (let i = 0; i < 5; i++) {
        generated.push(generatePuzzle(d, getDaySeed() + i + state.solved.length));
      }
      return generated;
    }
    return unsolved;
  };

  const catIcon = (c: string) => c === "logic" ? "🧩" : c === "crypto" ? "₿" : c === "hacker" ? "💻" : c === "pattern" ? "🔢" : "🔐";

  // Menu
  if (phase === "menu") {
    const daily = getDailyPuzzle();
    const dailySolved = state.solved.includes(daily.question);
    const weekly = getWeeklyElite();
    const weeklySolved = state.solved.includes(weekly.question);

    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-purple-400">🧠 אליפות המוחות: חידות עילית</h3>
          <p className="text-sm text-muted-foreground">רמה {state.level} | נקודות: {state.totalPoints} | נפתרו: {state.solved.length} | רצף: {state.streak}</p>
        </div>

        <div className="px-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>רמה {state.level}</span>
            <span>{state.xp}/{state.xpToNext} XP</span>
          </div>
          <Progress value={(state.xp / state.xpToNext) * 100} className="h-2" />
        </div>

        {showBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-card border-2 border-purple-500/50 rounded-2xl p-6 text-center animate-scale-in shadow-2xl">
              <div className="text-4xl mb-2">{showBadge.split(" ")[0]}</div>
              <p className="text-lg font-bold text-purple-400">תג חדש!</p>
              <p className="font-medium">{showBadge}</p>
            </div>
          </div>
        )}

        {state.badges.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {state.badges.includes("brain") && <Badge className="bg-yellow-500/20 text-yellow-400">🧠 מוח חד</Badge>}
            {state.badges.includes("genius") && <Badge className="bg-blue-500/20 text-blue-400">💡 גאון</Badge>}
            {state.badges.includes("speed") && <Badge className="bg-cyan-500/20 text-cyan-400">⚡ ברק</Badge>}
            {state.badges.includes("hacker") && <Badge className="bg-red-500/20 text-red-400">💻 האקר</Badge>}
            {state.badges.includes("master") && <Badge className="bg-purple-500/20 text-purple-400">👑 מאסטר</Badge>}
          </div>
        )}

        <DailyQuestPanel gameKey="mindArena" />

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => !dailySolved && startPuzzle(daily)} disabled={dailySolved}
            className={`p-4 rounded-xl border-2 text-center transition-all ${dailySolved ? "border-green-500/30 opacity-60" : "border-primary/40 hover:border-primary bg-primary/5"}`}>
            <div className="text-2xl mb-1">📅</div>
            <div className="font-bold text-sm">חידה יומית</div>
            <div className="text-xs text-muted-foreground">100 נקודות</div>
            {dailySolved && <span className="text-green-400 text-xs">✅</span>}
          </button>
          <button onClick={() => !weeklySolved && startPuzzle(weekly)} disabled={weeklySolved}
            className={`p-4 rounded-xl border-2 text-center transition-all ${weeklySolved ? "border-green-500/30 opacity-60" : "border-red-500/40 hover:border-red-500 bg-red-500/5"}`}>
            <div className="text-2xl mb-1">🏆</div>
            <div className="font-bold text-sm">אתגר שבועי</div>
            <div className="text-xs text-muted-foreground">500 נקודות | עילית</div>
            {weeklySolved && <span className="text-green-400 text-xs">✅</span>}
          </button>
        </div>

        <p className="text-sm font-bold text-muted-foreground">בחר רמת קושי:</p>
        <div className="grid grid-cols-2 gap-3">
          {DIFFICULTIES.map(d => {
            const pool = d.key === "easy" ? EASY_PUZZLES : d.key === "medium" ? MEDIUM_PUZZLES : d.key === "hard" ? HARD_PUZZLES : ELITE_PUZZLES;
            const solvedCount = pool.filter(p => state.solved.includes(p.question)).length;
            return (
              <button key={d.key} onClick={() => { setSelectedDifficulty(d.key); setPhase("difficulty"); }}
                className={`p-4 rounded-xl border-2 ${d.color} bg-card hover:scale-[1.02] transition-all text-center`}>
                <div className="text-2xl mb-1">{d.emoji}</div>
                <div className="font-bold">{d.label}</div>
                <div className="text-xs text-muted-foreground">{solvedCount}/{pool.length} נפתרו</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Difficulty puzzle list
  if (phase === "difficulty" && selectedDifficulty) {
    const puzzles = getPuzzlesForDifficulty(selectedDifficulty);
    const diffInfo = DIFFICULTIES.find(d => d.key === selectedDifficulty)!;
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <button onClick={() => setPhase("menu")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>←</span> חזרה
        </button>
        <h3 className="text-xl font-bold text-center">{diffInfo.emoji} חידות — {diffInfo.label}</h3>
        <div className="space-y-2">
          {puzzles.slice(0, 10).map((p, i) => (
            <button key={i} onClick={() => startPuzzle(p)}
              className="w-full text-right p-4 rounded-xl border-2 border-border hover:border-purple-500/40 transition-all bg-card">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg ml-2">{catIcon(p.category)}</span>
                  <span className="font-medium">{p.question.length > 40 ? p.question.slice(0, 40) + "..." : p.question}</span>
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">{p.points} נק' | {p.timeLimit}ש'</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Result
  if (phase === "result" && currentPuzzle) {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className="animate-scale-in">
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-5xl">{result === "correct" ? "🎉" : "😔"}</div>
            <p className={`text-2xl font-bold ${result === "correct" ? "text-green-400" : "text-red-400"}`}>
              {result === "correct" ? "נכון!" : "לא נכון"}
            </p>
            <p className="text-muted-foreground">התשובה: {currentPuzzle.answer}</p>
            {result === "correct" && <p className="text-primary font-bold">+{currentPuzzle.points} נקודות!</p>}
            <Button onClick={() => setPhase(selectedDifficulty ? "difficulty" : "menu")} className="w-full">חזרה</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing
  return (
    <div className="max-w-lg mx-auto" dir="rtl">
      <Card className="animate-fade-in border-purple-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{catIcon(currentPuzzle?.category || "")} חידה</CardTitle>
            <span className={`font-bold text-lg ${timeLeft < 10 ? "text-red-400 animate-pulse" : ""}`}>⏱️ {timeLeft}ש'</span>
          </div>
          {currentPuzzle && (
            <Badge variant="outline" className={DIFFICULTIES.find(d => d.key === currentPuzzle.difficulty)?.color}>
              {DIFFICULTIES.find(d => d.key === currentPuzzle.difficulty)?.label}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-muted/50 rounded-xl text-center">
            <p className="text-xl font-bold leading-relaxed">{currentPuzzle?.question}</p>
          </div>
          {showHint && (
            <div className="p-3 bg-yellow-500/10 rounded-lg text-center text-sm animate-fade-in">💡 רמז: {currentPuzzle?.hint}</div>
          )}
          <div className="flex gap-2">
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="התשובה שלך..." className="flex-1 text-lg text-center"
              onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(); }} />
            <Button onClick={submitAnswer} disabled={!answer.trim()}>שלח</Button>
          </div>
          <div className="flex gap-2">
            {!showHint && <Button variant="ghost" onClick={() => setShowHint(true)} className="flex-1 text-sm">💡 רמז</Button>}
            <Button variant="ghost" onClick={() => setPhase(selectedDifficulty ? "difficulty" : "menu")} className="flex-1 text-sm">חזרה</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
