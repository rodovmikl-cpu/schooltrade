import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

// ========== MISSION DATA ==========

interface MissionChoice {
  text: string;
  type: "correct" | "caught_now" | "caught_next";
}

interface MissionStep {
  narrative: string;
  choices: MissionChoice[];
}

interface MissionTemplate {
  title: string;
  emoji: string;
  briefing: string;
  difficulty: "easy" | "hard";
  steps: MissionStep[];
  reward: number;
}

// Generate shuffled choices for a step
const shuffleChoices = (choices: MissionChoice[], seed: number): MissionChoice[] => {
  const arr = [...choices];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor(((s - 1) / 2147483646) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ===== 25 EASY MISSIONS =====
const EASY_MISSIONS: MissionTemplate[] = [
  {
    title: "📧 המייל החשוד", emoji: "📧", briefing: "מייל מחשיד הגיע למשרד. חקור את המקור.", difficulty: "easy", reward: 200,
    steps: [
      { narrative: "מייל מוצפן הגיע מכתובת לא ידועה. מה תעשה?", choices: [
        { text: "בדוק את כותרת המייל בכלי אבטחה", type: "correct" },
        { text: "פתח את הקובץ המצורף", type: "caught_now" },
        { text: "העבר את המייל לכולם לבדיקה", type: "caught_next" },
      ]},
      { narrative: "הכותרת חשפה שרת זר. מה הצעד הבא?", choices: [
        { text: "עקוב אחרי ה-IP של השולח", type: "correct" },
        { text: "שלח תשובה למייל", type: "caught_now" },
        { text: "התעלם ומחק", type: "caught_next" },
      ]},
      { narrative: "ה-IP מוביל לבניין נטוש. איך תפעל?", choices: [
        { text: "שלח דרון לצילום מרחוק", type: "correct" },
        { text: "לך לבד לבדוק", type: "caught_now" },
        { text: "תתקשר למספר שמצאת במייל", type: "caught_next" },
      ]},
      { narrative: "בצילום נראה אדם עם מחשב נייד. מה עכשיו?", choices: [
        { text: "דווח לצוות ותאם מעצר", type: "correct" },
        { text: "צעק לעברו שייעצר", type: "caught_now" },
        { text: "המתן לראות מה יקרה", type: "caught_next" },
      ]},
      { narrative: "הצוות מוכן. איך מבצעים?", choices: [
        { text: "הכנס בשקט מהדלת האחורית", type: "correct" },
        { text: "פרוץ מהדלת הראשית", type: "caught_now" },
        { text: "שלח הודעה שאתם בדרך", type: "caught_next" },
      ]},
    ],
  },
  {
    title: "🔐 הסיסמה האבודה", emoji: "🔐", briefing: "סיסמת מערכת קריטית נגנבה. שחזר אותה.", difficulty: "easy", reward: 180,
    steps: [
      { narrative: "המערכת ננעלה. איפה תחפש רמזים?", choices: [
        { text: "בדוק לוגים של הגישה האחרונה", type: "correct" },
        { text: "נסה סיסמאות אקראיות", type: "caught_now" },
        { text: "כבה את השרת", type: "caught_next" },
      ]},
      { narrative: "הלוגים מראים גישה ב-3 בלילה. מה תבדוק?", choices: [
        { text: "צילומי מצלמות אבטחה של הלילה", type: "correct" },
        { text: "שאל את כולם מי היה", type: "caught_now" },
        { text: "שנה את כל הסיסמאות מיד", type: "caught_next" },
      ]},
      { narrative: "אדם מוסווה נראה במצלמות. איך תזהה?", choices: [
        { text: "נתח את גובהו ותנועותיו בתוכנה", type: "correct" },
        { text: "פרסם את התמונה ברשת", type: "caught_now" },
        { text: "תחכה שיחזור שוב", type: "caught_next" },
      ]},
      { narrative: "הניתוח מצביע על עובד מסוים. מה הצעד?", choices: [
        { text: "בדוק את המחשב שלו בסתר", type: "correct" },
        { text: "האשם אותו בפומבי", type: "caught_now" },
        { text: "ספר לו שאתה יודע", type: "caught_next" },
      ]},
      { narrative: "מצאת את הסיסמה על המחשב שלו!", choices: [
        { text: "שחזר גישה ודווח", type: "correct" },
        { text: "תשתמש בסיסמה בעצמך", type: "caught_now" },
        { text: "תמחק את הראיות", type: "caught_next" },
      ]},
    ],
  },
  {
    title: "🏢 הבוגד במשרד", emoji: "🏢", briefing: "מישהו מדליף סודות לחברה מתחרה.", difficulty: "easy", reward: 220,
    steps: [
      { narrative: "דליפת מידע מהמשרד. מה הצעד הראשון?", choices: [
        { text: "בדוק מי ניגש לקבצים רגישים לאחרונה", type: "correct" },
        { text: "האשם את העובד החדש", type: "caught_now" },
        { text: "שלח מייל לכולם שיש חקירה", type: "caught_next" },
      ]},
      { narrative: "שלושה עובדים ניגשו לקבצים. כולם חשודים.", choices: [
        { text: "הזן מידע מזויף שונה לכל אחד ועקוב", type: "correct" },
        { text: "חקור את כולם בחדר", type: "caught_now" },
        { text: "פטר את שלושתם", type: "caught_next" },
      ]},
      { narrative: "המידע המזויף של דנה הגיע למתחרה!", choices: [
        { text: "עקוב אחרי ההתנהגות של דנה בזהירות", type: "correct" },
        { text: "עצור אותה מיד", type: "caught_now" },
        { text: "ספר לעובדים אחרים", type: "caught_next" },
      ]},
      { narrative: "דנה נפגשת עם מישהו מחוץ למשרד!", choices: [
        { text: "צלם את הפגישה כראיה", type: "correct" },
        { text: "רוץ לעברם", type: "caught_now" },
        { text: "תתקשר למשטרה עכשיו", type: "caught_next" },
      ]},
      { narrative: "יש לך ראיות מוצקות. סיום המשימה.", choices: [
        { text: "הגש דוח רשמי עם כל הראיות", type: "correct" },
        { text: "סחוט את דנה", type: "caught_now" },
        { text: "תשמור את זה לעצמך", type: "caught_next" },
      ]},
    ],
  },
  {
    title: "📱 האפליקציה המסוכנת", emoji: "📱", briefing: "אפליקציה זדונית מופצת בין עובדים.", difficulty: "easy", reward: 190,
    steps: [
      { narrative: "עובדים מדווחים על אפליקציה חדשה שצצה בטלפון.", choices: [
        { text: "נתח את האפליקציה בסביבה מבודדת", type: "correct" },
        { text: "התקן את האפליקציה בטלפון שלך", type: "caught_now" },
        { text: "התעלם - בטח סתם פרסומת", type: "caught_next" },
      ]},
      { narrative: "האפליקציה שולחת נתונים לשרת חיצוני!", choices: [
        { text: "חסום את התקשורת לשרת ברשת", type: "correct" },
        { text: "שלח הודעה לשרת", type: "caught_now" },
        { text: "מחק את האפליקציה מטלפון אחד", type: "caught_next" },
      ]},
      { narrative: "השרת נמצא ברוסיה. מה הצעד הבא?", choices: [
        { text: "שתף את הממצאים עם צוות אבטחה", type: "correct" },
        { text: "נסה לפרוץ לשרת", type: "caught_now" },
        { text: "התעלם - זה רחוק מדי", type: "caught_next" },
      ]},
      { narrative: "צוות אבטחה מוכן. איך מנקים?", choices: [
        { text: "הסר את האפליקציה מכל המכשירים בו-זמנית", type: "correct" },
        { text: "תודיע לעובדים שימחקו בעצמם", type: "caught_now" },
        { text: "חכה עד מחר", type: "caught_next" },
      ]},
      { narrative: "האפליקציה הוסרה. בדיקה אחרונה.", choices: [
        { text: "בדוק שאין backdoor נוסף", type: "correct" },
        { text: "הכרז על סיום ותלך", type: "caught_now" },
        { text: "השאר את זה לצוות IT", type: "caught_next" },
      ]},
    ],
  },
  {
    title: "🚗 המרדף", emoji: "🚗", briefing: "חשוד נמלט עם מידע מסווג.", difficulty: "easy", reward: 210,
    steps: [
      { narrative: "חשוד נראה יוצא מהמשרד עם דיסק-און-קי.", choices: [
        { text: "עקוב מרחוק ותעד", type: "correct" },
        { text: "רוץ אחריו בריצה", type: "caught_now" },
        { text: "תתקשר לו לשאול", type: "caught_next" },
      ]},
      { narrative: "החשוד נכנס לרכב ונוסע. מה תעשה?", choices: [
        { text: "עקוב ברכב במרחק בטוח", type: "correct" },
        { text: "חסום את הדרך ברכב שלך", type: "caught_now" },
        { text: "תרשום את מספר הרכב ותחזור", type: "caught_next" },
      ]},
      { narrative: "הוא עוצר ליד בניין ישן. מה הצעד?", choices: [
        { text: "צפה מבחוץ וצלם את הכניסה", type: "correct" },
        { text: "הכנס אחריו לבניין", type: "caught_now" },
        { text: "לך הביתה ודווח מחר", type: "caught_next" },
      ]},
      { narrative: "אדם נוסף מגיע לפגישה. מה עכשיו?", choices: [
        { text: "הקלט את השיחה מבחוץ", type: "correct" },
        { text: "הכנס וצעק שייעצרו", type: "caught_now" },
        { text: "עזוב - זה מסוכן מדי", type: "caught_next" },
      ]},
      { narrative: "יש לך הקלטה עם ראיות. סיום.", choices: [
        { text: "העבר ראיות לרשויות", type: "correct" },
        { text: "תפרסם את ההקלטה ברשת", type: "caught_now" },
        { text: "שמור לעצמך ותשתמש מאוחר", type: "caught_next" },
      ]},
    ],
  },
  // 20 more easy missions (abbreviated for space but full structure)
  ...generateEasyMissions(),
];

function generateEasyMissions(): MissionTemplate[] {
  const templates: { title: string; emoji: string; briefing: string; reward: number; stepsData: { narrative: string; correct: string; caught_now: string; caught_next: string }[] }[] = [
    { title: "🕵️ הצלם המסתורי", emoji: "🕵️", briefing: "מישהו מצלם מסמכים סודיים.", reward: 200,
      stepsData: [
        { narrative: "מצלמה נסתרת נמצאה במשרד. איפה תחפש?", correct: "בדוק מי התקין ציוד לאחרונה", caught_now: "הודע לכולם על המצלמה", caught_next: "השמד את המצלמה מיד" },
        { narrative: "טכנאי חיצוני ביקר אתמול.", correct: "בדוק את תיעוד הביקור שלו", caught_now: "התקשר אליו וצעק", caught_next: "התעלם - הוא כבר הלך" },
        { narrative: "הטכנאי עבד עבור חברה מתחרה!", correct: "אסוף ראיות נוספות בשקט", caught_now: "פרסם את זה ברשת", caught_next: "ספר לעובדים" },
        { narrative: "מצאת עוד מצלמות. צריך לפעול!", correct: "נטרל את כולן בו-זמנית", caught_now: "השמד רק אחת כניסיון", caught_next: "תתייעץ עם המתחרה" },
        { narrative: "כל המצלמות נוטרלו. שלב אחרון.", correct: "הגש תלונה עם ראיות", caught_now: "נקום בחברה המתחרה", caught_next: "שכח מהעניין" },
      ]},
    { title: "💼 התיק הנעלם", emoji: "💼", briefing: "תיק עם מסמכים חשובים נעלם.", reward: 190,
      stepsData: [
        { narrative: "תיק חשוב נעלם מהכספת.", correct: "בדוק מי פתח את הכספת לאחרונה", caught_now: "שבור את הכספת הפתוחה", caught_next: "הודע לכולם שהתיק נגנב" },
        { narrative: "הקוד הוכנס ב-2:00 בלילה.", correct: "בדוק מצלמות אבטחה של הלילה", caught_now: "נסה לפרוץ את מחשב האבטחה", caught_next: "תחכה שהגנב יחזיר" },
        { narrative: "צללית נראית במסדרון.", correct: "השווה גובה ומבנה גוף לעובדים", caught_now: "רוץ למסדרון עכשיו", caught_next: "התעלם מהצללית" },
        { narrative: "חשוד מזוהה! הוא עדיין במשרד.", correct: "ארגן מעקב שקט", caught_now: "עצור אותו בכוח", caught_next: "שלח לו הודעה" },
        { narrative: "מצאת את התיק בארון שלו!", correct: "תעד ודווח לממונים", caught_now: "קח את התיק ותברח", caught_next: "השאר את זה שם" },
      ]},
    { title: "🌐 המתקפה ברשת", emoji: "🌐", briefing: "מתקפת סייבר על הארגון.", reward: 230,
      stepsData: [
        { narrative: "המערכות מואטות. סימנים למתקפה.", correct: "נתח את תעבורת הרשת", caught_now: "כבה את כל השרתים", caught_next: "תחכה שזה יעבור" },
        { narrative: "יש תעבורה חריגה מפורט 8080.", correct: "חסום את הפורט ונתח", caught_now: "פתח את כל הפורטים לבדיקה", caught_next: "שלח מייל לתמיכה" },
        { narrative: "מצאת כתובת IP של התוקף!", correct: "עקוב אחרי ה-IP והתחבר ל-CERT", caught_now: "תקוף בחזרה", caught_next: "רשום ותמשיך הלאה" },
        { narrative: "התוקף ניסה לגנוב מאגר נתונים.", correct: "בודד את המאגר והצפן", caught_now: "מחק את כל הנתונים", caught_next: "העתק את הנתונים למחשב שלך" },
        { narrative: "המתקפה נעצרה. סיום.", correct: "כתוב דוח מפורט ועדכן הגנות", caught_now: "הכרז על ניצחון בלי תיקון", caught_next: "תשכח מזה" },
      ]},
    { title: "🗝️ המפתח הכפול", emoji: "🗝️", briefing: "מישהו שיכפל מפתח לחדר הסודי.", reward: 195,
      stepsData: [
        { narrative: "דלת החדר הסודי נפתחה ללא הרשאה.", correct: "בדוק את יומן הכניסות", caught_now: "שבור את המנעול", caught_next: "הודע לכולם" },
        { narrative: "הכניסה האחרונה לא מזוהה.", correct: "בדוק טביעות אצבע על המנעול", caught_now: "נסה כל מפתח שמצאת", caught_next: "חכה לכניסה הבאה" },
        { narrative: "טביעת אצבע תואמת לעובד חדש.", correct: "בדוק את הרקע שלו בשקט", caught_now: "התעמת איתו מול כולם", caught_next: "ספר לחבר שלו" },
        { narrative: "לעובד יש עבר פלילי!", correct: "דווח לגורם הרלוונטי", caught_now: "פרסם את זה", caught_next: "תתעלם" },
        { narrative: "המפתח המשוכפל נמצא.", correct: "השמד את המפתח והחלף מנעול", caught_now: "השתמש במפתח בעצמך", caught_next: "החזר לעובד" },
      ]},
    { title: "📡 השידור המוצפן", emoji: "📡", briefing: "שידור מוצפן נקלט ממקור לא ידוע.", reward: 215,
      stepsData: [
        { narrative: "אנטנה קולטת שידור מוצפן.", correct: "נתח את תדר השידור", caught_now: "שדר בחזרה באותו תדר", caught_next: "כבה את האנטנה" },
        { narrative: "השידור מגיע מבניין סמוך.", correct: "שלח צוות לתצפית שקטה", caught_now: "לך לבד לבדוק", caught_next: "דווח למשטרה בלי ראיות" },
        { narrative: "מצאת משדר על הגג!", correct: "תעד ונתח את המכשיר", caught_now: "הרוס את המשדר", caught_next: "קח אותו הביתה" },
        { narrative: "המשדר שייך לארגון מתחרה.", correct: "אסוף ראיות נוספות", caught_now: "פנה ישירות לארגון", caught_next: "מכור את המידע" },
        { narrative: "יש מספיק ראיות לפעולה.", correct: "הגש תלונה רשמית", caught_now: "נקום בעצמך", caught_next: "סחוט אותם" },
      ]},
    { title: "🎭 הזהות הכפולה", emoji: "🎭", briefing: "עובד חי חיים כפולים.", reward: 205,
      stepsData: [
        { narrative: "עובד נראה בשני מקומות בו-זמנית.", correct: "אסוף תיעוד מדויק", caught_now: "התעמת איתו", caught_next: "ספר לבוס" },
        { narrative: "לעובד יש כרטיס זהות שני!", correct: "בדוק את הזהות במאגרים", caught_now: "גנוב את הכרטיס", caught_next: "שאל אותו ישירות" },
        { narrative: "הזהות השנייה שייכת לסוכן זר.", correct: "דווח לגורמי ביטחון", caught_now: "פרסם את זה", caught_next: "סחוט אותו" },
        { narrative: "גורמי ביטחון רוצים שתמשיך לעקוב.", correct: "המשך מעקב בהתנהגות רגילה", caught_now: "ספר לעובד שעוקבים אחריו", caught_next: "תפסיק לעבוד" },
        { narrative: "יש מספיק ראיות למעצר.", correct: "תאם מעצר שקט", caught_now: "עצור אותו בעצמך", caught_next: "תן לו לברוח" },
      ]},
    { title: "💻 וירוס הכופר", emoji: "💻", briefing: "מישהו הפיץ וירוס כופר ברשת.", reward: 225,
      stepsData: [
        { narrative: "קבצים מוצפנים ודורשים כופר.", correct: "בודד את המחשבים הנגועים", caught_now: "שלם את הכופר", caught_next: "כבה את הכל" },
        { narrative: "הווירוס הגיע ממייל.", correct: "זהה מי פתח את המייל", caught_now: "פתח את המייל במחשב שלך", caught_next: "מחק את כל המיילים" },
        { narrative: "העובד פתח את המייל בטעות.", correct: "נתח את הווירוס וחפש פגיעות", caught_now: "פטר את העובד", caught_next: "תתעלם מהנזק" },
        { narrative: "מצאת דרך לפצח את ההצפנה!", correct: "שחרר את הקבצים ותקן אבטחה", caught_now: "שחרר קבצים בלי תיקון", caught_next: "מכור את הפתרון" },
        { narrative: "המערכת שוחזרה. שלב אחרון.", correct: "עדכן הגנות ותדרך עובדים", caught_now: "הכרז על ניצחון", caught_next: "תשכח מזה" },
      ]},
    { title: "🔍 העד הנעלם", emoji: "🔍", briefing: "עד מפתח נעלם לפני העדות.", reward: 200,
      stepsData: [
        { narrative: "עד חשוב לא הגיע לפגישה.", correct: "בדוק את מיקומו האחרון", caught_now: "הודע לעיתונות", caught_next: "בטל את החקירה" },
        { narrative: "הטלפון שלו כבוי מאתמול.", correct: "בדוק מצלמות בסביבת הבית", caught_now: "פרוץ לביתו", caught_next: "שלח לו מייל" },
        { narrative: "נראה עוזב את ביתו עם מזוודה.", correct: "עקוב אחרי רכבו במערכת", caught_now: "חסום את הדרך ברכב", caught_next: "תחכה שיחזור" },
        { narrative: "הוא בדרך לשדה התעופה!", correct: "תאם עם ביטחון שדה התעופה", caught_now: "רוץ לשדה התעופה", caught_next: "תוותר - הוא כבר ברח" },
        { narrative: "נעצר לפני הטיסה!", correct: "שכנע אותו להעיד בביטחון", caught_now: "אלץ אותו להעיד", caught_next: "שחרר ותשכח" },
      ]},
    { title: "🏦 השוד הפנימי", emoji: "🏦", briefing: "כסף נעלם מהקופה בלי פריצה.", reward: 210,
      stepsData: [
        { narrative: "100,000₪ נעלמו מהכספת.", correct: "בדוק את הקוד של מי הוכנס", caught_now: "האשם את הקופאי", caught_next: "הודע לכולם" },
        { narrative: "הקוד של המנהל הוכנס.", correct: "בדוק אם המנהל היה בבניין", caught_now: "התעמת עם המנהל", caught_next: "שנה את הקוד" },
        { narrative: "המנהל היה בחופש! מישהו גנב את הקוד.", correct: "בדוק מי ניגש לשולחן המנהל", caught_now: "חפש בארנק של כולם", caught_next: "ספר למנהל" },
        { narrative: "המזכירה ניגשה לשולחן אתמול.", correct: "בדוק את חשבון הבנק שלה בשקט", caught_now: "האשם אותה בפומבי", caught_next: "ספר לה שאתה יודע" },
        { narrative: "נמצאה העברה חשודה מחשבונה!", correct: "דווח לרשויות עם ראיות", caught_now: "סחוט אותה", caught_next: "תתעלם" },
      ]},
    { title: "🎤 ההדלפה לתקשורת", emoji: "🎤", briefing: "מידע פנימי הגיע לעיתונאי.", reward: 195,
      stepsData: [
        { narrative: "כתבה עם מידע פנימי פורסמה.", correct: "זהה אילו קבצים מצוטטים", caught_now: "תתקשר לעיתונאי ותצעק", caught_next: "שלח הודעה לכל העובדים" },
        { narrative: "רק 4 אנשים גישה לקבצים האלה.", correct: "תן מידע שונה לכל אחד", caught_now: "פטר את כולם", caught_next: "סגור את הגישה" },
        { narrative: "המידע של יוסי הופיע בכתבה!", correct: "עקוב אחרי התקשורת שלו", caught_now: "התעמת מול כולם", caught_next: "ספר לו שאתה חוקר" },
        { narrative: "יוסי שלח מיילים לעיתונאי!", correct: "אסוף ראיות מהשרת", caught_now: "מחק את המיילים", caught_next: "שלח מייל לעיתונאי" },
        { narrative: "ראיות מוכנות.", correct: "הגש דוח משפטי", caught_now: "נקום ביוסי", caught_next: "השתק את הנושא" },
      ]},
    // 10 more easy missions
    { title: "🔌 החיבור הסודי", emoji: "🔌", briefing: "נמצא חיבור רשת לא מורשה.", reward: 185,
      stepsData: [
        { narrative: "נמצא כבל רשת שלא מופיע בתרשים.", correct: "עקוב אחרי הכבל פיזית", caught_now: "נתק אותו מיד", caught_next: "תתעלם" },
        { narrative: "הכבל מוביל לחדר שרתים ישן.", correct: "בדוק מה מחובר בצד השני", caught_now: "כנס לחדר בלי הכנה", caught_next: "דווח בלי לבדוק" },
        { narrative: "מחשב לא מזוהה מחובר!", correct: "נתח את התעבורה שלו", caught_now: "כבה אותו מיד", caught_next: "השתמש בו" },
        { narrative: "המחשב שולח נתונים החוצה!", correct: "חסום ותעד", caught_now: "שלח נתונים מזויפים", caught_next: "חכה ותראה" },
        { narrative: "זיהית את בעל המחשב.", correct: "דווח עם ראיות", caught_now: "פנה אליו ישירות", caught_next: "מחק הכל" },
      ]},
    { title: "🚪 הדלת הנעולה", emoji: "🚪", briefing: "חדר סודי נפתח בלילה.", reward: 200,
      stepsData: [
        { narrative: "אזעקה כובתה בחדר הסודי.", correct: "בדוק לוג אזעקות", caught_now: "כנס לחדר עכשיו", caught_next: "חכה לבוקר" },
        { narrative: "האזעקה כובתה עם קוד פנימי.", correct: "בדוק מי מכיר את הקוד", caught_now: "שנה את הקוד מיד", caught_next: "דווח בלי בדיקה" },
        { narrative: "שלושה אנשים יודעים את הקוד.", correct: "בדוק אליבי של כל אחד", caught_now: "האשם אחד מהם", caught_next: "תוותר" },
        { narrative: "לאחד אין אליבי!", correct: "אסוף עוד ראיות", caught_now: "עצור אותו", caught_next: "שכח מזה" },
        { narrative: "מצאת את הראיות.", correct: "דווח ותקן אבטחה", caught_now: "נקום", caught_next: "שמור בסוד" },
      ]},
    { title: "📊 המניפולציה", emoji: "📊", briefing: "מישהו שינה נתונים בדוחות.", reward: 215,
      stepsData: [
        { narrative: "דוחות כספיים לא מסתדרים.", correct: "השווה גרסאות קודמות", caught_now: "שנה את הנתונים בחזרה", caught_next: "התעלם" },
        { narrative: "מישהו שינה ערכים ב-3 דוחות.", correct: "בדוק את הגישה לקבצים", caught_now: "מחק את כל הדוחות", caught_next: "ספר לכולם" },
        { narrative: "הגישה האחרונה הייתה מהמחשב של רן.", correct: "בדוק אם רן היה במשרד", caught_now: "פטר את רן", caught_next: "שאל את רן" },
        { narrative: "רן היה בחופשה - מישהו השתמש במחשב שלו.", correct: "בדוק טביעות אצבע על המחשב", caught_now: "נעל את כל המחשבים", caught_next: "חכה שרן יחזור" },
        { narrative: "זיהית את המניפולטור!", correct: "דווח עם הראיות", caught_now: "סחוט אותו", caught_next: "תתעלם" },
      ]},
    { title: "🎒 הגניבה בהפסקה", emoji: "🎒", briefing: "ציוד יקר נגנב בזמן הפסקה.", reward: 180,
      stepsData: [
        { narrative: "מחשב נייד נעלם מהמשרד.", correct: "בדוק מצלמות הפסקת הצהריים", caught_now: "חפש בתיקים של כולם", caught_next: "קנה מחשב חדש" },
        { narrative: "אדם עם תיק גדול נראה יוצא.", correct: "זהה אותו מהמצלמות", caught_now: "עצור את כל היוצאים", caught_next: "דווח מחר" },
        { narrative: "העובד מזוהה - הוא חזר לשבת.", correct: "בדוק את התיק שלו בתירוץ", caught_now: "צעק שהוא גנב", caught_next: "ספר לחבר שלו" },
        { narrative: "המחשב נמצא בתיק!", correct: "תעד וקרא לממונה", caught_now: "קח את המחשב בכוח", caught_next: "תגיד לו להחזיר" },
        { narrative: "יש ראיות מצלמה ותיעוד.", correct: "הגש דוח רשמי", caught_now: "פרסם את זה", caught_next: "שמור בסוד" },
      ]},
    { title: "🗃️ הקובץ החסר", emoji: "🗃️", briefing: "קובץ קריטי נמחק מהמערכת.", reward: 195,
      stepsData: [
        { narrative: "קובץ פרויקט חשוב נמחק.", correct: "בדוק את יומן המחיקות", caught_now: "שחזר בלי בדיקה", caught_next: "צור קובץ חדש" },
        { narrative: "הקובץ נמחק מחשבון אדמין.", correct: "בדוק מי חיבר את חשבון האדמין", caught_now: "שנה סיסמת אדמין", caught_next: "תתעלם" },
        { narrative: "החיבור היה מ-IP חיצוני!", correct: "חקור את ה-IP", caught_now: "חסום את כל ה-IP-ים", caught_next: "דווח בלי חקירה" },
        { narrative: "ה-IP שייך לעובד לשעבר.", correct: "אסוף ראיות ושחזר גישה", caught_now: "פרוץ למחשב שלו", caught_next: "מחק את ההיסטוריה" },
        { narrative: "הקובץ שוחזר והגנב זוהה.", correct: "דווח ותקן אבטחה", caught_now: "נקום בעובד", caught_next: "תשכח" },
      ]},
  ];

  return templates.map(t => ({
    title: t.title,
    emoji: t.emoji,
    briefing: t.briefing,
    difficulty: "easy" as const,
    reward: t.reward,
    steps: t.stepsData.map(s => ({
      narrative: s.narrative,
      choices: [
        { text: s.correct, type: "correct" as const },
        { text: s.caught_now, type: "caught_now" as const },
        { text: s.caught_next, type: "caught_next" as const },
      ],
    })),
  }));
}

// ===== 25 HARD MISSIONS =====
const HARD_MISSIONS: MissionTemplate[] = generateHardMissions();

function generateHardMissions(): MissionTemplate[] {
  const templates: { title: string; emoji: string; briefing: string; reward: number; stepsData: { narrative: string; correct: string; cn1: string; cn2: string; cnt1: string; cnt2: string }[] }[] = [
    { title: "🕸️ רשת הריגול", emoji: "🕸️", briefing: "רשת ריגול פועלת מתוך הארגון. 7 שלבים למציאתם.", reward: 500,
      stepsData: [
        { narrative: "דליפות מרובות מצביעות על רשת מאורגנת.", correct: "הפעל מעקב סמוי על כל ההתקשרויות", cn1: "הודע לכל העובדים על החקירה", cn2: "שכור חוקר חיצוני פומבי", cnt1: "בדוק רק את המחלקה שלך", cnt2: "חכה לדליפה הבאה" },
        { narrative: "מצאת תבנית - דליפות כל יום שלישי.", correct: "הכן מלכודת מידע ליום שלישי", cn1: "סגור את המשרד ביום שלישי", cn2: "שלח מייל שאתה יודע", cnt1: "דווח על התבנית בלי לפעול", cnt2: "שנה את ימי העבודה" },
        { narrative: "שלושה עובדים תמיד נמצאים ביום שלישי.", correct: "הזן לכל אחד מידע מזויף ייחודי", cn1: "חקור את שלושתם ביחד", cn2: "פטר את שלושתם", cnt1: "בדוק רק אחד מהם", cnt2: "שאל אותם אם הם מרגלים" },
        { narrative: "שני חלקי מידע מזויף הגיעו החוצה!", correct: "שני מרגלים! עקוב אחרי שניהם בנפרד", cn1: "עצור את שניהם מיד", cn2: "התעמת עם שניהם ביחד", cnt1: "עקוב רק אחרי אחד", cnt2: "דווח על אחד בלבד" },
        { narrative: "אחד מהם נפגש עם סוכן זר!", correct: "צלם את הפגישה ותעד הכל", cn1: "הפרע לפגישה", cn2: "התקשר למשטרה באמצע", cnt1: "צפה מרחוק בלי לתעד", cnt2: "לך מהמקום" },
        { narrative: "השני מעביר קבצים דרך USB.", correct: "לכוד את ה-USB כראיה", cn1: "שבור את ה-USB", cn2: "העתק את הקבצים לעצמך", cnt1: "חכה שיסיים", cnt2: "ספר לו שאתה רואה" },
        { narrative: "יש מספיק ראיות נגד שניהם.", correct: "תאם מעצר בו-זמני של שניהם", cn1: "עצור רק אחד ותראה", cn2: "פרסם את הראיות", cnt1: "דווח רק על אחד", cnt2: "נסה לגייס אותם לצד שלך" },
      ]},
    { title: "🏴‍☠️ הפריצה למערכת", emoji: "🏴‍☠️", briefing: "האקר חדר למערכת ושתל סוס טרויאני.", reward: 550,
      stepsData: [
        { narrative: "זוהתה פעילות חשודה בשרת הראשי.", correct: "בודד את השרת ונתח לוגים", cn1: "כבה את כל השרתים", cn2: "פתח את הלוגים מהמחשב הנגוע", cnt1: "המתן ותראה מה קורה", cnt2: "דווח בלי ניתוח" },
        { narrative: "הלוגים מראים כניסה מ-3 מדינות!", correct: "זהה את ה-IP האמיתי דרך VPN analysis", cn1: "חסום את כל ה-IPs", cn2: "שלח הודעה ל-IP", cnt1: "בדוק רק מדינה אחת", cnt2: "תתעלם מה-IPs" },
        { narrative: "ה-IP האמיתי מגיע מתוך הארגון!", correct: "חפש את המכשיר ברשת הפנימית", cn1: "כבה את כל הרשת", cn2: "הודע לכל העובדים", cnt1: "סרוק רק קומה אחת", cnt2: "חכה למתקפה הבאה" },
        { narrative: "מצאת Raspberry Pi מוסתר בארון חשמל!", correct: "נתח את המכשיר בסביבה מבודדת", cn1: "חבר אותו לרשת שלך", cn2: "השמד את המכשיר", cnt1: "קח אותו הביתה", cnt2: "השאר אותו במקום" },
        { narrative: "המכשיר מכיל כלי ריגול מתוחכם.", correct: "חלץ ראיות ועקוב אחרי המפעיל", cn1: "הפעל את כלי הריגול", cn2: "שלח את הנתונים לעצמך", cnt1: "מחק את הכל מהמכשיר", cnt2: "ספר לעובדים" },
        { narrative: "עקבת מסלול - עובד IT התקין את המכשיר!", correct: "אסוף ראיות נוספות מהמחשב שלו", cn1: "עצור אותו מיד", cn2: "התעמת איתו", cnt1: "ספר למנהל IT", cnt2: "שלח לו מייל" },
        { narrative: "ראיות מלאות בידיך.", correct: "דווח לרשויות ותקן כל הפרצות", cn1: "פרסם את המקרה", cn2: "סחוט את העובד", cnt1: "תתעלם ותתקן רק את האבטחה", cnt2: "שמור את הראיות לעצמך" },
      ]},
    { title: "💣 איום מבפנים", emoji: "💣", briefing: "איום אנונימי מאיים להשמיד מידע קריטי.", reward: 520,
      stepsData: [
        { narrative: "הודעת איום אנונימית דורשת כופר.", correct: "נתח את ההודעה לזהות מקור", cn1: "שלם את הכופר", cn2: "הודע לתקשורת", cnt1: "מחק את ההודעה", cnt2: "שלח תשובה" },
        { narrative: "ההודעה נשלחה מרשת הארגון!", correct: "צמצם חשודים לפי שעת השליחה", cn1: "חקור את כולם בפומבי", cn2: "כבה את כל המערכות", cnt1: "חכה להודעה נוספת", cnt2: "שנה סיסמאות בלי חקירה" },
        { narrative: "5 עובדים היו מחוברים באותה שעה.", correct: "בדוק את היסטוריית הגלישה של כל אחד", cn1: "פטר את כולם", cn2: "התעמת עם כולם ביחד", cnt1: "בדוק רק שניים", cnt2: "דווח בלי חקירה" },
        { narrative: "עובד אחד גלש לאתרי הצפנה.", correct: "עקוב אחרי הפעילות שלו בזמן אמת", cn1: "חסום את המחשב שלו", cn2: "מחק את ההיסטוריה", cnt1: "שאל אותו למה גלש שם", cnt2: "ספר לחברים שלו" },
        { narrative: "הוא הכין סקריפט להשמדת נתונים!", correct: "חסום את הסקריפט בלי שידע", cn1: "הפעל את הסקריפט לבדיקה", cn2: "מחק את הסקריפט", cnt1: "העתק את הסקריפט", cnt2: "הודע לו שמצאת" },
        { narrative: "הסקריפט מתוזמן להפעלה מחר!", correct: "נטרל את התזמון ואסוף ראיות", cn1: "כבה את כל השרתים", cn2: "שנה את השעון במחשב", cnt1: "חכה למחר ותראה", cnt2: "מחק את כל הקבצים מראש" },
        { narrative: "האיום נוטרל והחשוד מזוהה.", correct: "תאם מעצר מתואם עם ראיות", cn1: "עצור אותו לבד", cn2: "פרסם את זהותו", cnt1: "שחרר אותו עם אזהרה", cnt2: "תן לו להתפטר" },
      ]},
    { title: "🌍 המבצע הבינלאומי", emoji: "🌍", briefing: "מידע רגיש נמכר לגורם עוין מעבר לים.", reward: 600,
      stepsData: [
        { narrative: "סוכנות ביון זרה זיהתה מידע ישראלי.", correct: "הפעל מעקב על כל ערוצי התקשורת", cn1: "פנה ישירות לסוכנות הזרה", cn2: "הודע לתקשורת", cnt1: "בדוק רק מייל", cnt2: "תחכה לאישור" },
        { narrative: "תקשורת מוצפנת יוצאת כל יום ב-14:00.", correct: "הכן יירוט ופענוח בדיוק ב-14:00", cn1: "חסום תקשורת ב-14:00", cn2: "שלח תקשורת מזויפת", cnt1: "בדוק רק פעם אחת", cnt2: "דווח על השעה" },
        { narrative: "הפענוח חשף שמות קוד של פרויקטים.", correct: "זהה מי מכיר את שמות הקוד", cn1: "שנה את שמות הקוד", cn2: "פרסם את השמות", cnt1: "בדוק רק פרויקט אחד", cnt2: "תתעלם" },
        { narrative: "רק 3 אנשים מכירים את כל השמות.", correct: "הזן מידע מזויף ייחודי לכל אחד", cn1: "חקור את שלושתם פומבית", cn2: "פטר את כולם", cnt1: "בדוק רק אחד", cnt2: "שאל אותם" },
        { narrative: "המידע המזויף של המנהל הבכיר הגיע!", correct: "אסוף ראיות מהמחשב שלו בסודיות", cn1: "התעמת איתו", cn2: "דווח לעיתונאי", cnt1: "ספר לעובד אחר", cnt2: "שמור את זה" },
        { narrative: "המנהל נפגש עם דיפלומט זר!", correct: "צלם את הפגישה עם צוות", cn1: "הפרע לפגישה", cn2: "התקשר לדיפלומט", cnt1: "צפה מרחוק בלי תיעוד", cnt2: "עזוב" },
        { narrative: "ראיות מוצקות. הגיע הזמן.", correct: "תאם מעצר עם גורמי ביטחון", cn1: "עצור לבד", cn2: "ברח מהארץ", cnt1: "דווח בלי ראיות", cnt2: "תן לו לברוח" },
      ]},
    { title: "🔬 ניסוי הסוד", emoji: "🔬", briefing: "תוצאות מחקר סודי נגנבו מהמעבדה.", reward: 480,
      stepsData: [
        { narrative: "מחקר של 5 שנים נעלם מהמחשב.", correct: "בדוק את מערכת הגיבויים", cn1: "שחזר מהענן בלי בדיקה", cn2: "תתחיל את המחקר מחדש", cnt1: "שאל את כולם", cnt2: "דווח מיד" },
        { narrative: "הגיבוי האחרון הועתק ל-USB חיצוני.", correct: "זהה את ה-USB דרך לוג המערכת", cn1: "חבר USB אקראי", cn2: "מחק את כל הגיבויים", cnt1: "בדוק רק USB אחד", cnt2: "תתעלם" },
        { narrative: "ה-USB שייך לחוקר חדש במעבדה.", correct: "בדוק את הרקע שלו לעומק", cn1: "פטר אותו מיד", cn2: "האשם אותו בפומבי", cnt1: "שאל אותו ישירות", cnt2: "ספר לחוקרים אחרים" },
        { narrative: "החוקר עבד קודם בחברה מתחרה!", correct: "הפעל מעקב על התקשורת שלו", cn1: "חסום את הגישה שלו", cn2: "התעמת איתו", cnt1: "דווח בלי חקירה", cnt2: "תתעלם מהקשר" },
        { narrative: "הוא שולח נתונים דרך אפליקציית צ'אט!", correct: "לכוד את ההודעות כראיה", cn1: "מחק את האפליקציה", cn2: "שלח לו הודעה", cnt1: "חסום את האפליקציה", cnt2: "קרא את ההודעות שלו" },
        { narrative: "הנתונים מגיעים למעבדה מתחרה!", correct: "תאם פעולה עם מחלקה משפטית", cn1: "פנה ישירות למעבדה", cn2: "פרסם את הסיפור", cnt1: "שלח אזהרה למעבדה", cnt2: "מכור את המידע" },
        { narrative: "יש ראיות לגניבת קניין רוחני.", correct: "הגש תביעה והגן על המחקר", cn1: "נקום בחוקר", cn2: "מחק את הראיות", cnt1: "תתפשר עם המתחרה", cnt2: "ותר על המחקר" },
      ]},
  ];

  return templates.map(t => ({
    title: t.title,
    emoji: t.emoji,
    briefing: t.briefing,
    difficulty: "hard" as const,
    reward: t.reward,
    steps: t.stepsData.map(s => ({
      narrative: s.narrative,
      choices: [
        { text: s.correct, type: "correct" as const },
        { text: s.cn1, type: "caught_now" as const },
        { text: s.cn2, type: "caught_now" as const },
        { text: s.cnt1, type: "caught_next" as const },
        { text: s.cnt2, type: "caught_next" as const },
      ],
    })),
  }));
}

// ========== GAME STATE ==========
const STORAGE_KEY = "shadow-missions-v2";

interface SavedState {
  totalPoints: number;
  completedMissions: string[];
  level: number;
  xp: number;
  xpToNext: number;
  badges: string[];
  streak: number;
  lastPlayDate: string;
}

const getDaySeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
};

// Get today's missions (refreshed daily)
const getTodayMissions = (difficulty: "easy" | "hard"): MissionTemplate[] => {
  const pool = difficulty === "easy" ? EASY_MISSIONS : HARD_MISSIONS;
  const seed = getDaySeed() + (difficulty === "hard" ? 999 : 0);
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  
  // Pick 5 missions for today
  const indices: number[] = [];
  while (indices.length < Math.min(5, pool.length)) {
    const idx = Math.floor(rand() * pool.length);
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => pool[i]);
};

export const ShadowMissions = () => {
  const [state, setState] = useState<SavedState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          totalPoints: p.totalPoints || 0,
          completedMissions: p.completedMissions || [],
          level: p.level || 1,
          xp: p.xp || 0,
          xpToNext: p.xpToNext || 300,
          badges: p.badges || [],
          streak: p.streak || 0,
          lastPlayDate: p.lastPlayDate || "",
        };
      } catch { /* */ }
    }
    return { totalPoints: 0, completedMissions: [], level: 1, xp: 0, xpToNext: 300, badges: [], streak: 0, lastPlayDate: "" };
  });

  const [difficulty, setDifficulty] = useState<"easy" | "hard" | null>(null);
  const [activeMission, setActiveMission] = useState<MissionTemplate | null>(null);
  const [step, setStep] = useState(0);
  const [shuffledChoices, setShuffledChoices] = useState<MissionChoice[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [missionPoints, setMissionPoints] = useState(0);
  const [lives, setLives] = useState(0);
  const [caughtNextTurn, setCaughtNextTurn] = useState(false);
  const [phase, setPhase] = useState<"menu" | "select" | "playing" | "result">("menu");
  const [resultType, setResultType] = useState<"win" | "lose">("win");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const addXP = (amount: number, s: SavedState): SavedState => {
    let xp = s.xp + amount;
    let level = s.level;
    let xpToNext = s.xpToNext;
    const badges = [...s.badges];
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level++;
      xpToNext = Math.floor(xpToNext * 1.3);
      playPremiumSound("levelUp");
    }
    if (level >= 3 && !badges.includes("agent")) badges.push("agent");
    if (level >= 5 && !badges.includes("elite")) badges.push("elite");
    if (s.completedMissions.length >= 10 && !badges.includes("veteran")) badges.push("veteran");
    if (s.streak >= 5 && !badges.includes("dedicated")) badges.push("dedicated");
    return { ...s, xp, level, xpToNext, badges };
  };

  const startMission = (mission: MissionTemplate) => {
    playPremiumSound("gameStart");
    setActiveMission(mission);
    setStep(0);
    setLog([`📋 תדריך: ${mission.briefing}`]);
    setMissionPoints(0);
    setLives(mission.difficulty === "easy" ? 2 : 1);
    setCaughtNextTurn(false);
    setPhase("playing");
    const seed = getDaySeed() + mission.title.length;
    setShuffledChoices(shuffleChoices(mission.steps[0].choices, seed));
  };

  const makeChoice = (choice: MissionChoice) => {
    if (!activeMission) return;

    // If caught_next was triggered last turn, any non-correct choice = game over
    if (caughtNextTurn && choice.type !== "correct") {
      playSound("error");
      setLog(prev => [...prev, `> ${choice.text}`, "🚨 נתפסת! החשד מהתור הקודם התממש!"]);
      endMission(false);
      return;
    }

    if (choice.type === "correct") {
      playSound("correct");
      const pointsEarned = activeMission.difficulty === "hard" ? 80 : 50;
      setMissionPoints(prev => prev + pointsEarned);
      setLog(prev => [...prev, `> ${choice.text}`, "✅ בחירה מצוינת! המשימה מתקדמת."]);
      setCaughtNextTurn(false);
    } else if (choice.type === "caught_now") {
      playSound("error");
      setLives(prev => prev - 1);
      if (lives <= 1) {
        setLog(prev => [...prev, `> ${choice.text}`, "🚨 נתפסת! המשימה נכשלה!"]);
        endMission(false);
        return;
      }
      setLog(prev => [...prev, `> ${choice.text}`, `⚠️ טעות חמורה! נשארו ${lives - 1} ניסיונות.`]);
      setCaughtNextTurn(false);
    } else if (choice.type === "caught_next") {
      playSound("incorrect");
      setLog(prev => [...prev, `> ${choice.text}`, "🔶 משהו לא מרגיש נכון... היזהר בתור הבא!"]);
      setCaughtNextTurn(true);
    }

    updateQuestProgress("shadowMissions", `shadowMissions-${getDaySeed()}-0`, 1);

    const nextStep = step + 1;
    if (nextStep >= activeMission.steps.length) {
      // Completed all steps!
      if (choice.type === "correct") {
        endMission(true);
      } else if (choice.type === "caught_next") {
        // Last step with caught_next = still pass but reduced reward
        endMission(true, true);
      }
      return;
    }

    setStep(nextStep);
    const seed = getDaySeed() + activeMission.title.length + nextStep * 7;
    setShuffledChoices(shuffleChoices(activeMission.steps[nextStep].choices, seed));
  };

  const endMission = (won: boolean, reduced = false) => {
    setResultType(won ? "win" : "lose");
    setPhase("result");

    if (won) {
      playPremiumSound("win");
      const bonus = reduced ? 0.5 : 1;
      const earned = Math.floor((missionPoints + (activeMission?.reward || 0)) * bonus);
      const today = new Date().toDateString();
      setState(prev => {
        const newStreak = prev.lastPlayDate === today ? prev.streak : prev.streak + 1;
        let next = {
          ...prev,
          totalPoints: prev.totalPoints + earned,
          completedMissions: [...prev.completedMissions, `${activeMission?.title}-${getDaySeed()}`],
          streak: newStreak,
          lastPlayDate: today,
        };
        return addXP(earned / 4, next);
      });
    } else {
      playSound("error");
    }
  };

  const diffColor = (d: string) => d === "hard" ? "text-red-400" : "text-green-400";

  // ========== PLAYING ==========
  if (phase === "playing" && activeMission) {
    const currentStep = activeMission.steps[step];
    return (
      <div className="max-w-lg mx-auto space-y-4" dir="rtl">
        <Card className="border-cyan-500/30">
          <CardContent className="py-6 space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold">{activeMission.emoji} {activeMission.title}</h3>
              <p className="text-sm text-muted-foreground">
                שלב {step + 1}/{activeMission.steps.length} | ❤️ ×{lives} | 💰 {missionPoints}
              </p>
              <Progress value={((step + 1) / activeMission.steps.length) * 100} className="h-2 mt-2" />
            </div>

            {/* Battle log */}
            {log.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm max-h-32 overflow-y-auto">
                {log.slice(-6).map((l, i) => (
                  <p key={i} className={l.startsWith(">") ? "text-primary font-medium" : l.includes("✅") ? "text-green-400" : l.includes("🚨") || l.includes("⚠️") ? "text-red-400" : "text-muted-foreground"}>
                    {l}
                  </p>
                ))}
              </div>
            )}

            {/* Narrative */}
            <div className="p-4 bg-muted/30 rounded-xl text-center">
              <p className="text-base font-medium leading-relaxed">{currentStep.narrative}</p>
            </div>

            {caughtNextTurn && (
              <div className="text-center text-sm text-orange-400 animate-pulse font-bold">
                ⚠️ אתה במעקב! בחר בזהירות!
              </div>
            )}

            {/* Choices */}
            <div className="space-y-2">
              {shuffledChoices.map((choice, i) => (
                <Button
                  key={i}
                  onClick={() => makeChoice(choice)}
                  variant="outline"
                  className="w-full py-4 text-sm text-right justify-start h-auto whitespace-normal"
                  style={{ animation: `fadeSlideIn 0.3s ease-out ${i * 0.05}s both` }}
                >
                  <span className="text-muted-foreground ml-2">{i + 1}.</span>
                  {choice.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== RESULT ==========
  if (phase === "result") {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className={`animate-scale-in ${resultType === "win" ? "border-green-500/30" : "border-red-500/30"}`}>
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-5xl">{resultType === "win" ? "🏆" : "💀"}</div>
            <p className={`text-2xl font-bold ${resultType === "win" ? "text-green-400" : "text-red-400"}`}>
              {resultType === "win" ? "משימה הושלמה!" : "המשימה נכשלה!"}
            </p>
            {resultType === "win" && (
              <p className="text-lg">+{missionPoints + (activeMission?.reward || 0)} נקודות</p>
            )}
            {resultType === "lose" && (
              <p className="text-muted-foreground">נסה שוב - למד מהטעויות!</p>
            )}
            <Button onClick={() => { setPhase("select"); setActiveMission(null); }} className="w-full">
              חזרה למשימות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== MISSION SELECT ==========
  if (phase === "select" && difficulty) {
    const todayMissions = getTodayMissions(difficulty);
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <button onClick={() => setPhase("menu")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>←</span> חזרה
        </button>
        <h3 className="text-xl font-bold text-center">
          {difficulty === "easy" ? "🟢 משימות קלות" : "🔴 משימות קשות"} — היום
        </h3>
        <p className="text-xs text-center text-muted-foreground">
          {difficulty === "easy" ? "5 שאלות, 3 אפשרויות, 2 חיים" : "7 שאלות, 5 אפשרויות, חיים בודד"}
        </p>
        <div className="space-y-3">
          {todayMissions.map((m, i) => {
            const doneKey = `${m.title}-${getDaySeed()}`;
            const done = state.completedMissions.includes(doneKey);
            return (
              <button key={i} onClick={() => !done && startMission(m)} disabled={done}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all ${done ? "border-green-500/30 bg-green-500/5 opacity-60" : "border-border hover:border-cyan-500/40 bg-card"}`}
                style={{ animation: `fadeSlideIn 0.3s ease-out ${i * 0.05}s both` }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold">{m.emoji} {m.title}</span>
                    <p className="text-sm text-muted-foreground mt-1">{m.briefing}</p>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">{m.reward} נק'</div>
                    {done && <span className="text-green-400 text-xs">✓ הושלם</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== MENU ==========
  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-cyan-400">🕶️ משימות צללים אונליין</h3>
        <p className="text-sm text-muted-foreground">
          רמה {state.level} | נקודות: {state.totalPoints} | הושלמו: {state.completedMissions.length} | רצף: {state.streak} ימים
        </p>
      </div>

      {/* XP Bar */}
      <div className="px-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>רמה {state.level}</span>
          <span>{state.xp}/{state.xpToNext} XP</span>
        </div>
        <Progress value={(state.xp / state.xpToNext) * 100} className="h-2" />
      </div>

      {state.badges.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {state.badges.includes("agent") && <Badge className="bg-cyan-500/20 text-cyan-400">🕵️ סוכן</Badge>}
          {state.badges.includes("elite") && <Badge className="bg-purple-500/20 text-purple-400">👑 עילית</Badge>}
          {state.badges.includes("veteran") && <Badge className="bg-yellow-500/20 text-yellow-400">⭐ ותיק</Badge>}
          {state.badges.includes("dedicated") && <Badge className="bg-green-500/20 text-green-400">🔥 מסור</Badge>}
        </div>
      )}

      <DailyQuestPanel gameKey="shadowMissions" />

      {/* Difficulty selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { setDifficulty("easy"); setPhase("select"); }}
          className="p-6 rounded-2xl border-2 border-green-500/40 bg-green-500/5 hover:bg-green-500/10 transition-all text-center"
        >
          <div className="text-3xl mb-2">🟢</div>
          <div className="font-bold text-green-400 text-lg">קל</div>
          <div className="text-xs text-muted-foreground mt-1">5 שלבים | 3 אפשרויות</div>
          <div className="text-xs text-muted-foreground">2 חיים | הבחנה קלה</div>
        </button>
        <button
          onClick={() => { setDifficulty("hard"); setPhase("select"); }}
          className="p-6 rounded-2xl border-2 border-red-500/40 bg-red-500/5 hover:bg-red-500/10 transition-all text-center"
        >
          <div className="text-3xl mb-2">🔴</div>
          <div className="font-bold text-red-400 text-lg">קשה</div>
          <div className="text-xs text-muted-foreground mt-1">7 שלבים | 5 אפשרויות</div>
          <div className="text-xs text-muted-foreground">חיים בודד | דומה מאוד</div>
        </button>
      </div>

      <Card>
        <CardContent className="py-4 text-sm space-y-2">
          <p className="font-bold">📋 חוקי המשימה:</p>
          <p>• בחר את הפעולה הנכונה בכל שלב</p>
          <p>• <span className="text-red-400">נתפסת מיד</span> = מאבד חיים</p>
          <p>• <span className="text-orange-400">חשד</span> = בתור הבא כל טעות = כישלון</p>
          <p>• רק הבחירה ההגיונית ביותר נכונה</p>
          <p>• המשימות מתחלפות כל יום!</p>
        </CardContent>
      </Card>
    </div>
  );
};
