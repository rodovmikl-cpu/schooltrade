import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CLASS_LEVELS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא"];

const TIME_OPTIONS = [
  { label: "5 דקות", value: 300 },
  { label: "10 דקות", value: 600 },
  { label: "15 דקות", value: 900 },
  { label: "20 דקות", value: 1200 },
];

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Story {
  title: string;
  pages: string[];
  questions: Question[];
}

interface ReadingRound {
  story: Story;
}

type GamePhase = "classSelect" | "modeSelect" | "reading" | "questions" | "finished" | "timeUp";

interface GameState {
  totalPoints: number;
  gamesPlayed: number;
}

// Grade-appropriate Hebrew stories based on Israeli curriculum
const getStoriesForClass = (classLevel: number): Story[] => {
  // Classes א-ב (1-2): Very simple stories
  if (classLevel <= 1) {
    return [
      {
        title: "הכלב שלי",
        pages: [
          "לדני יש כלב קטן. הכלב נקרא שוקו. שוקו הוא כלב חום וחמוד מאוד.",
          "כל בוקר דני מאכיל את שוקו. הוא נותן לו אוכל ומים. שוקו שמח מאוד.",
          "אחרי הצהריים דני ושוקו הולכים לפארק. הם משחקים עם כדור.",
          "שוקו אוהב לרוץ ולקפוץ. דני זורק את הכדור ושוקו מביא אותו בחזרה.",
          "בערב שוקו ישן ליד המיטה של דני. הם חברים הכי טובים בעולם."
        ],
        questions: [
          { question: "איך קוראים לכלב של דני?", options: ["רקסי", "שוקו", "בובי", "לוקי"], correctIndex: 1 },
          { question: "מה הצבע של הכלב?", options: ["לבן", "שחור", "חום", "אפור"], correctIndex: 2 },
          { question: "מה דני עושה כל בוקר?", options: ["ישן", "מאכיל את שוקו", "הולך לבית ספר", "משחק"], correctIndex: 1 },
          { question: "לאן הולכים דני ושוקו אחרי הצהריים?", options: ["לים", "לפארק", "לחנות", "לסבתא"], correctIndex: 1 },
          { question: "איפה שוקו ישן בערב?", options: ["בחצר", "במטבח", "ליד המיטה של דני", "על הספה"], correctIndex: 2 }
        ]
      },
      {
        title: "יום בגן החיות",
        pages: [
          "היום הלכנו לגן החיות. ראינו הרבה חיות מעניינות. היה לנו כיף גדול.",
          "ראינו אריה גדול עם רעמה. הוא שאג בקול חזק. קצת פחדנו אבל גם צחקנו.",
          "הקופים היו מצחיקים מאוד. הם קפצו מעץ לעץ ואכלו בננות.",
          "הג'ירפה הייתה גבוהה מאוד. היא אכלה עלים מהעצים הגבוהים.",
          "בסוף קנינו גלידה וחזרנו הביתה שמחים. זה היה יום נהדר!"
        ],
        questions: [
          { question: "לאן הלכו הילדים?", options: ["לפארק", "לגן החיות", "לים", "לבית ספר"], correctIndex: 1 },
          { question: "מה עשה האריה?", options: ["ישן", "אכל", "שאג", "רץ"], correctIndex: 2 },
          { question: "מה הקופים אכלו?", options: ["תפוחים", "בננות", "עלים", "גזר"], correctIndex: 1 },
          { question: "למה הג'ירפה יכולה לאכול עלים מעצים גבוהים?", options: ["כי היא חזקה", "כי היא גבוהה", "כי היא מהירה", "כי היא קטנה"], correctIndex: 1 },
          { question: "מה הילדים עשו בסוף?", options: ["הלכו לים", "קנו גלידה", "שיחקו כדורגל", "ישנו"], correctIndex: 1 }
        ]
      }
    ];
  }
  
  // Classes ג-ד (3-4): Medium difficulty stories
  if (classLevel <= 3) {
    return [
      {
        title: "המסע הגדול של הנמלה",
        pages: [
          "נמלה קטנה בשם נורית יצאה למסע ארוך. היא רצתה למצוא אוכל למשפחה שלה. השמש זרחה חזק והדרך הייתה ארוכה.",
          "בדרך נורית פגשה חיפושית אדומה. החיפושית אמרה: 'לאן את הולכת לבד?' נורית סיפרה לה על המשפחה הרעבה שלה.",
          "החיפושית הציעה לעזור. יחד הן המשיכו בדרך. עברו מתחת לעלים גדולים ובין פרחים צבעוניים.",
          "לפתע הן מצאו ערימה גדולה של פירורי לחם! זה היה יותר ממה שנורית יכלה לשאת לבד.",
          "החיפושית עזרה לנורית לשאת את הפירורים הביתה. המשפחה של נורית שמחה מאוד. מאז נורית והחיפושית הפכו לחברות טובות."
        ],
        questions: [
          { question: "מה שם הנמלה בסיפור?", options: ["נעמה", "נורית", "נועה", "נטע"], correctIndex: 1 },
          { question: "למה נורית יצאה למסע?", options: ["לטייל", "למצוא חברים", "למצוא אוכל", "לראות את העולם"], correctIndex: 2 },
          { question: "מי עזרה לנורית בדרך?", options: ["פרפר", "חיפושית", "דבורה", "עכביש"], correctIndex: 1 },
          { question: "מה הן מצאו?", options: ["סוכריות", "עלים", "פירורי לחם", "פרחים"], correctIndex: 2 },
          { question: "מה הלקח מהסיפור?", options: ["לא לעזור לאחרים", "חברות עוזרת", "לא לצאת מהבית", "לאכול הרבה"], correctIndex: 1 }
        ]
      },
      {
        title: "הגשם הפלאי",
        pages: [
          "כבר שלושה חודשים לא ירד גשם בכפר הקטן. האדמה הייתה יבשה והפרחים היו עצובים. כל התושבים דאגו מאוד.",
          "ילדה בשם מיכל החליטה לעשות משהו. היא אספה את כל ילדי הכפר והם החליטו לרקוד ריקוד גשם.",
          "הילדים יצאו לרחוב הראשי ורקדו בכל הכוח. הם שרו שירים על גשם ועל מים. המבוגרים הסתכלו בהפתעה.",
          "לפתע השמיים התכסו בעננים כהים. רעם נשמע מרחוק. טיפות גשם גדולות התחילו לרדת!",
          "כל הכפר יצא לרחוב לחגוג. הפרחים הרימו את הראש והאדמה שתתה בצמא. מאז, בכל קיץ יבש, הילדים רוקדים ריקוד גשם."
        ],
        questions: [
          { question: "כמה זמן לא ירד גשם?", options: ["שבוע", "חודש", "שלושה חודשים", "שנה"], correctIndex: 2 },
          { question: "מה שם הילדה שהחליטה לעשות משהו?", options: ["מיכל", "מאיה", "מירי", "מור"], correctIndex: 0 },
          { question: "מה הילדים עשו כדי להביא גשם?", options: ["התפללו", "רקדו ריקוד גשם", "בכו", "שתקו"], correctIndex: 1 },
          { question: "מה קרה אחרי שהילדים רקדו?", options: ["השמש זרחה", "ירד גשם", "נשב רוח", "ירד שלג"], correctIndex: 1 },
          { question: "מה הכפר עושה מאז בכל קיץ יבש?", options: ["מתפללים", "נוסעים למקום אחר", "הילדים רוקדים", "שותקים"], correctIndex: 2 }
        ]
      }
    ];
  }
  
  // Classes ה-ו (5-6): More complex stories
  if (classLevel <= 5) {
    return [
      {
        title: "הגיבור האמיתי",
        pages: [
          "יונתן היה ילד שתמיד רצה להיות גיבור. הוא קרא ספרים על גיבורי על ודמיין שיש לו כוחות מיוחדים. בבית הספר הוא היה שקט ולא בלט במיוחד.",
          "יום אחד, בזמן ההפסקה, יונתן ראה קבוצת ילדים שצוחקת על דוד, ילד חדש בכיתה. הם לעגו לו בגלל המבטא שלו. דוד עמד לבד ונראה עצוב מאוד.",
          "יונתן הרגיש משהו בבטן. הוא ידע שזה לא נכון, אבל פחד להתערב. הוא חשב על הגיבורים מהספרים - הם תמיד עשו את הדבר הנכון, גם כשהיה קשה.",
          "יונתן נשם עמוק והלך אל דוד. 'בוא נשחק כדורגל יחד,' הוא אמר בקול רועד. הילדים האחרים הסתכלו בהפתעה. חלקם הצטרפו למשחק.",
          "מאותו יום דוד ויונתן הפכו לחברים טובים. יונתן הבין שגיבור אמיתי הוא לא מי שיש לו כוחות על, אלא מי שעושה את הדבר הנכון גם כשזה קשה."
        ],
        questions: [
          { question: "על מה יונתן חלם?", options: ["להיות רופא", "להיות גיבור", "להיות שחקן", "להיות מורה"], correctIndex: 1 },
          { question: "מה קרה לדוד בהפסקה?", options: ["הוא נפל", "ילדים צחקו עליו", "הוא ניצח במשחק", "הוא קיבל פרס"], correctIndex: 1 },
          { question: "למה יונתן פחד להתערב?", options: ["הוא היה עייף", "הוא לא אהב את דוד", "הוא פחד מהילדים", "הוא לא ראה"], correctIndex: 2 },
          { question: "מה יונתן עשה בסוף?", options: ["הלך הביתה", "הזמין את דוד לשחק", "צחק עם האחרים", "התעלם"], correctIndex: 1 },
          { question: "מה הלקח מהסיפור?", options: ["גיבורים צריכים כוחות על", "לא כדאי להתערב", "גיבור עושה את הנכון גם כשקשה", "כדאי להיות שקט"], correctIndex: 2 }
        ]
      },
      {
        title: "הממציא הצעיר",
        pages: [
          "דניאל אהב לפרק דברים ולהרכיב אותם מחדש. החדר שלו היה מלא בחלקים של מכשירים ישנים. ההורים שלו לא תמיד הבינו אותו, אבל תמכו בו.",
          "בבית הספר הייתה תחרות המצאות. כל תלמיד יכל להציג המצאה משלו. דניאל התלהב מאוד והחליט להשתתף. הוא רצה להמציא משהו שיעזור לאנשים.",
          "דניאל שם לב שסבתא שלו מתקשה לזכור לקחת את התרופות שלה. הוא החליט לבנות קופסת תרופות חכמה שמזכירה מתי לקחת כל תרופה.",
          "שבועות של עבודה קשה עברו. דניאל התמודד עם הרבה כשלונות. פעמים רבות המכשיר לא עבד והוא רצה לוותר. אבל הוא נזכר בסבתא והמשיך.",
          "ביום התחרות דניאל הציג את ההמצאה שלו. השופטים התרשמו מאוד. הוא זכה במקום הראשון! אבל הפרס האמיתי היה החיוך של סבתא כשהיא קיבלה את המתנה."
        ],
        questions: [
          { question: "מה דניאל אהב לעשות?", options: ["לצייר", "לפרק ולהרכיב דברים", "לשחק כדורגל", "לקרוא ספרים"], correctIndex: 1 },
          { question: "מה הייתה הבעיה של סבתא?", options: ["היא לא שמעה טוב", "היא שכחה לקחת תרופות", "היא לא ראתה טוב", "היא לא יכלה ללכת"], correctIndex: 1 },
          { question: "מה דניאל המציא?", options: ["רובוט", "קופסת תרופות חכמה", "טלפון", "שעון"], correctIndex: 1 },
          { question: "מה קרה כשדניאל נתקל בכשלונות?", options: ["ויתר", "בכה", "המשיך לנסות", "ביקש עזרה"], correctIndex: 2 },
          { question: "מה היה הפרס האמיתי לדעת דניאל?", options: ["הכסף", "הפרס", "החיוך של סבתא", "הציון"], correctIndex: 2 }
        ]
      }
    ];
  }
  
  // Classes ז-ח (7-8): Complex stories with deeper themes
  if (classLevel <= 7) {
    return [
      {
        title: "המפתח האבוד",
        pages: [
          "בעיירה העתיקה ליד הים חי זקן בשם אליהו. הוא היה שומר המגדלור האחרון. כל לילה הוא עלה למגדלור והדליק את האור שהנחה את הספינות. אנשי העיירה לא תמיד הבינו כמה חשובה העבודה שלו.",
          "יום אחד אליהו גילה שהמפתח למגדלור נעלם. בלי המפתח הוא לא יכל להיכנס ולהדליק את האור. הוא חיפש בכל מקום אבל לא מצא. הלילה התקרב ואליהו ידע שספינות רבות מתקרבות לחוף.",
          "נכדו הצעיר, עידו, בא לבקר. הוא ראה את הסבא המודאג ושאל מה קרה. כששמע על המפתח האבוד, עידו החליט לעזור. הוא חשב היכן סבא יכל לשים את המפתח.",
          "עידו נזכר שסבא סיפר לו פעם על מקום סודי שבו הוא מחביא דברים יקרים. הוא רץ לסלע הגדול ליד החוף ומצא שם תיבה קטנה. בתוכה היה המפתח!",
          "באותו לילה אליהו ועידו עלו יחד למגדלור והדליקו את האור. אליהו הבין שהגיע הזמן ללמד את נכדו את סודות המגדלור. הידע צריך לעבור מדור לדור."
        ],
        questions: [
          { question: "מה הייתה העבודה של אליהו?", options: ["דייג", "שומר מגדלור", "נגר", "מורה"], correctIndex: 1 },
          { question: "מה הבעיה שאליהו גילה?", options: ["המגדלור נשבר", "המפתח נעלם", "הים סוער", "אין חשמל"], correctIndex: 1 },
          { question: "מי עזר לאליהו?", options: ["שכן", "חבר", "נכדו עידו", "איש עירייה"], correctIndex: 2 },
          { question: "איפה נמצא המפתח?", options: ["בבית", "בסלע ליד החוף", "בכיס", "על השולחן"], correctIndex: 1 },
          { question: "מה אליהו הבין בסוף הסיפור?", options: ["שהוא זקן מדי", "שהמגדלור לא חשוב", "שהידע צריך לעבור לדור הבא", "שעידו לא מתאים"], correctIndex: 2 }
        ]
      }
    ];
  }
  
  // Classes ט-יא (9-11): Advanced literary texts
  return [
    {
      title: "בין שתי עולמות",
      pages: [
        "מיה עמדה על סף החלטה גורלית. היא קיבלה הצעה ללמוד באוניברסיטה מפורסמת בחו״ל, אבל זה אומר לעזוב את המשפחה, את החברים, ואת כל מה שהכירה. בלילות היא שכבה ערה וחשבה על העתיד.",
        "אביה, רופא מוערך, תמיד חלם שהיא תמשיך את דרכו. אמה, אמנית, עודדה אותה לחפש את הדרך שלה. ״החיים שלך הם לא העתק של החיים שלנו,״ אמרה לה אמא בשיחה ארוכה.",
        "מיה חשבה על סבתא שלה שנפטרה לפני שנה. סבתא תמיד אמרה: ״הפחד מהלא נודע גדול מהלא נודע עצמו.״ היא גם סיפרה על הרגע שבו היא עצמה עזבה את הכפר הקטן והגיעה לעיר הגדולה.",
        "בסופו של דבר מיה הבינה שאין תשובה נכונה או לא נכונה. יש רק בחירות ותוצאות. היא החליטה לקבל את ההצעה, אבל גם ידעה שהיא תמיד תישא איתה את הבית שלה בלב.",
        "ביום שעזבה, אביה חיבק אותה ואמר: ״אני גאה בך לא בגלל לאן את הולכת, אלא בגלל האומץ לבחור.״ מיה עלתה למטוס עם דמעות בעיניים וחיוך על הפנים."
      ],
      questions: [
        { question: "מה ההחלטה שמיה צריכה לקבל?", options: ["לעבוד או ללמוד", "ללמוד בחו״ל או להישאר", "להתחתן או לא", "לעזור לאבא או לאמא"], correctIndex: 1 },
        { question: "מה הייתה עמדת האמא?", options: ["שמיה תישאר", "שמיה תמשיך את דרך האבא", "שמיה תחפש את הדרך שלה", "שמיה לא תלמד"], correctIndex: 2 },
        { question: "מה סבתא אמרה על פחד?", options: ["שצריך לפחד", "שהפחד מהלא נודע גדול מהלא נודע עצמו", "שאין ממה לפחד", "שפחד זה טוב"], correctIndex: 1 },
        { question: "מה מיה הבינה בסוף?", options: ["שהיא טועה", "שאין תשובה נכונה, רק בחירות", "שהיא צריכה להישאר", "שההורים צודקים"], correctIndex: 1 },
        { question: "על מה האבא היה גאה?", options: ["על הציונים שלה", "על האוניברסיטה", "על האומץ שלה לבחור", "על הכסף שהיא הרוויחה"], correctIndex: 2 }
      ]
    },
    {
      title: "הצל של האמת",
      pages: [
        "העיתונאית דנה חקרה פרשת שחיתות בעירייה כבר חודשים. היא ידעה שפרסום הכתבה יפגע באנשים חזקים. בלילה היא קיבלה שיחה אנונימית: ״תפסיקי לחפור, זה לא שווה את זה.״",
        "דנה הייתה צריכה להחליט: להמשיך לחפש את האמת או לוותר? היא נזכרה למה בחרה להיות עיתונאית. ״האמת היא לא רק זכות, היא חובה,״ כתב המרצה שלה פעם על הלוח.",
        "מקור סודי בתוך העירייה יצר איתה קשר. הוא מסר לה מסמכים שהוכיחו את השחיתות. אבל הוא גם אמר: ״אם תפרסמי, הקריירה שלי תיגמר.״ דנה עמדה בפני דילמה מוסרית.",
        "היא התייעצה עם העורך שלה. ״לפעמים לעשות את הדבר הנכון זה גם הדבר הקשה ביותר,״ הוא אמר. ״אבל ההחלטה היא שלך.״",
        "דנה פרסמה את הכתבה, אבל שמרה על זהות המקור. האמת יצאה לאור, אנשים הועמדו לדין, והמקור שמר על מקום עבודתו. היא למדה שלפעמים אפשר למצוא דרך שמכבדת גם את האמת וגם את האנשים."
      ],
      questions: [
        { question: "מה דנה חקרה?", options: ["רצח", "שחיתות בעירייה", "גניבה", "הונאה בחברה"], correctIndex: 1 },
        { question: "מה היה באיום האנונימי?", options: ["לפטר אותה", "לפגוע בה", "להפסיק לחקור", "לברוח"], correctIndex: 2 },
        { question: "מה הדילמה המוסרית של דנה?", options: ["להרוויח כסף או לא", "לפרסם ולפגוע במקור או לוותר", "לעבוד או לנוח", "לחקור או לכתוב"], correctIndex: 1 },
        { question: "מה העורך אמר לדנה?", options: ["לוותר", "שהיא טועה", "שההחלטה היא שלה", "לפרסם בכל מחיר"], correctIndex: 2 },
        { question: "איך דנה פתרה את הדילמה?", options: ["לא פרסמה", "פרסמה וחשפה את המקור", "פרסמה ושמרה על המקור", "עזבה את העבודה"], correctIndex: 2 }
      ]
    }
  ];
};

const generateRound = (classLevel: number): ReadingRound => {
  const stories = getStoriesForClass(classLevel);
  const selectedStory = stories[Math.floor(Math.random() * stories.length)];
  return { story: selectedStory };
};

export const HebrewGame = () => {
  const [phase, setPhase] = useState<GamePhase>("classSelect");
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<number>(600);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [round, setRound] = useState<ReadingRound | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>({ totalPoints: 0, gamesPlayed: 0 });
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("hebrewGameState");
    if (saved) {
      setGameState(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if ((phase === "reading" || phase === "questions") && timedMode && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPhase("timeUp");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timedMode, timeLeft]);

  const startGame = () => {
    const newRound = generateRound(selectedClass);
    setRound(newRound);
    setCurrentPage(0);
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setShowResult(false);
    setStartTime(Date.now());
    if (timedMode) {
      setTimeLeft(selectedTime);
    }
    setPhase("reading");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!round) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPage < round.story.pages.length - 1) {
        setCurrentPage(prev => prev + 1);
      } else if (diff < 0 && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  const goToQuestions = () => {
    setPhase("questions");
  };

  const selectAnswer = (index: number) => {
    if (!round || showResult) return;
    
    const correct = index === round.story.questions[currentQuestion].correctIndex;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestion < round.story.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setShowResult(false);
      } else {
        finishGame();
      }
    }, 1200);
  };

  const finishGame = () => {
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    setTotalTime(timeTaken);
    
    const basePoints = correctAnswers * 20;
    const timeBonus = Math.max(0, 50 - Math.floor(timeTaken / 30));
    const points = basePoints + timeBonus;
    setEarnedPoints(points);
    
    const newState = {
      totalPoints: gameState.totalPoints + points,
      gamesPlayed: gameState.gamesPlayed + 1
    };
    setGameState(newState);
    localStorage.setItem("hebrewGameState", JSON.stringify(newState));
    
    setPhase("finished");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetToMenu = () => {
    setPhase("modeSelect");
    setShowResult(false);
  };

  const resetToClassSelect = () => {
    setPhase("classSelect");
  };

  return (
    <div className="max-w-2xl mx-auto p-4" dir="rtl">
      {phase === "classSelect" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center text-2xl">📚 משחק עברית</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">בחר רמת כיתה:</p>
            <div className="grid grid-cols-4 gap-3">
              {CLASS_LEVELS.map((level, index) => (
                <Button
                  key={level}
                  variant={selectedClass === index ? "default" : "outline"}
                  onClick={() => {
                    setSelectedClass(index);
                    setPhase("modeSelect");
                  }}
                  className="text-xl py-6"
                >
                  {level}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "modeSelect" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center text-2xl">📚 משחק עברית - כיתה {CLASS_LEVELS[selectedClass]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-lg font-bold">סה"כ נקודות: {gameState.totalPoints}</p>
            </div>
            
            <div className="space-y-4">
              <p className="font-medium">בחר מצב משחק:</p>
              <div className="flex gap-4">
                <Button
                  variant={!timedMode ? "default" : "outline"}
                  onClick={() => setTimedMode(false)}
                  className="flex-1"
                >
                  מצב רגיל
                </Button>
                <Button
                  variant={timedMode ? "default" : "outline"}
                  onClick={() => setTimedMode(true)}
                  className="flex-1"
                >
                  מצב זמן
                </Button>
              </div>
            </div>

            {timedMode && (
              <div className="space-y-2 animate-fade-in">
                <p className="font-medium">בחר זמן:</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      variant={selectedTime === option.value ? "default" : "outline"}
                      onClick={() => setSelectedTime(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button onClick={startGame} className="flex-1 py-6 text-lg">
                התחל
              </Button>
              <Button variant="outline" onClick={resetToClassSelect} className="flex-1 py-6 text-lg">
                שנה רמת כיתה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "reading" && round && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{round.story.title}</span>
              {timedMode && (
                <span className={cn(
                  "text-lg font-bold",
                  timeLeft < 60 && "text-destructive animate-pulse"
                )}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              עמוד {currentPage + 1}/{round.story.pages.length}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              ref={containerRef}
              className="min-h-[280px] p-6 bg-muted/50 rounded-xl text-lg leading-relaxed cursor-grab transition-all"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {round.story.pages[currentPage]}
            </div>

            <div className="flex justify-center gap-2">
              {round.story.pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors",
                    idx === currentPage ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                ← הקודם
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(round.story.pages.length - 1, prev + 1))}
                disabled={currentPage === round.story.pages.length - 1}
              >
                הבא →
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              החלק שמאלה/ימינה או לחץ על הכפתורים לעבור בין עמודים
            </p>

            {currentPage === round.story.pages.length - 1 && (
              <Button onClick={goToQuestions} className="w-full py-6 text-lg animate-fade-in">
                סיימתי לקרוא - המשך לשאלות →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "questions" && round && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="text-lg">שאלה {currentQuestion + 1}/{round.story.questions.length}</span>
              {timedMode && (
                <span className={cn(
                  "text-lg font-bold",
                  timeLeft < 60 && "text-destructive animate-pulse"
                )}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6 bg-muted/50 rounded-xl">
              <p className="text-xl font-bold px-4">{round.story.questions[currentQuestion].question}</p>
            </div>

            {showResult && (
              <div className={cn(
                "text-center py-4 rounded-xl animate-scale-in text-3xl font-bold",
                isCorrect ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              )}>
                {isCorrect ? "✔️ נכון!" : "❌ לא נכון"}
              </div>
            )}

            <div className="grid gap-3">
              {round.story.questions[currentQuestion].options.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => selectAnswer(idx)}
                  disabled={showResult}
                  className={cn(
                    "py-4 text-lg justify-start",
                    showResult && idx === round.story.questions[currentQuestion].correctIndex && "bg-green-500/20 border-green-500",
                    showResult && !isCorrect && idx !== round.story.questions[currentQuestion].correctIndex && "opacity-50"
                  )}
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "finished" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center text-3xl">🎉 כל הכבוד! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="py-8 space-y-4">
              <p className="text-2xl">⏱️ זמן כולל: {formatTime(totalTime)}</p>
              <p className="text-2xl">✅ תשובות נכונות: {correctAnswers}/{round?.story.questions.length || 0}</p>
              <p className="text-3xl font-bold text-primary">🏆 נקודות שנצברו: {earnedPoints}</p>
            </div>
            <Button onClick={resetToMenu} className="w-full py-6 text-lg">
              חזור לתפריט
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "timeUp" && (
        <Card className="animate-fade-in border-destructive">
          <CardContent className="py-12 text-center space-y-6">
            <p className="text-4xl font-bold text-destructive">⏱️ הפסדת!</p>
            <p className="text-xl text-muted-foreground">הזמן נגמר</p>
            <Button onClick={resetToMenu} className="w-full py-6 text-lg">
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
