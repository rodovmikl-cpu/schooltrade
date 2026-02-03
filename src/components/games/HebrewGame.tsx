import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CLASS_LEVELS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא"];

const TIME_OPTIONS = [
  { label: "3 דקות", value: 180 },
  { label: "5 דקות", value: 300 },
  { label: "10 דקות", value: 600 },
  { label: "15 דקות", value: 900 },
];

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ReadingRound {
  textPages: string[];
  questions: Question[];
}

type GamePhase = "classSelect" | "modeSelect" | "reading" | "questions" | "finished" | "timeUp";

interface GameState {
  totalPoints: number;
  gamesPlayed: number;
}

const generateRound = (classLevel: number): ReadingRound => {
  // Sample Hebrew texts based on class level
  const easyTexts = [
    "דני הלך לבית הספר. הוא פגש את חברו יוסי. יחד הם למדו מתמטיקה ועברית. בהפסקה הם שיחקו כדורגל בחצר.",
    "שרה אוהבת לקרוא ספרים. היא הולכת לספרייה כל שבוע. הספרנית תמיד עוזרת לה למצוא ספרים חדשים ומעניינים.",
    "הכלב של משפחת כהן נקרא שוקו. הוא כלב חום וחמוד. כל יום הוא רץ בפארק ומשחק עם כלבים אחרים."
  ];

  const mediumTexts = [
    "החורף הגיע לעיר הקטנה. השלג כיסה את הרחובות והילדים יצאו לשחק בשלג. הם בנו איש שלג גדול עם כובע וצעיף. אמא הכינה להם שוקו חם כשחזרו הביתה.",
    "בחג הפסח המשפחה התאספה לסדר. סבא קרא את ההגדה וכולם שרו יחד. הילדים חיפשו את האפיקומן ומצאו אותו מאחורי הספה. היה ערב נפלא.",
    "טל רצתה ללמוד לנגן בפסנתר. היא התחילה לקחת שיעורים פעם בשבוע. בהתחלה היה קשה, אבל עם הרבה תרגול היא השתפרה. עכשיו היא יכולה לנגן שירים יפים."
  ];

  const hardTexts = [
    "המדענים גילו כוכב לכת חדש במערכת השמש החיצונית. הכוכב גדול פי שניים מכדור הארץ ונמצא במרחק של מיליארדי קילומטרים מהשמש. החוקרים משערים שייתכן ויש עליו מים בצורת קרח. זהו גילוי מרגש שיכול לשנות את הבנתנו על היקום.",
    "בתקופה העתיקה חיו בארץ ישראל אנשים רבים מתרבויות שונות. הם בנו ערים גדולות, עסקו בחקלאות ובמסחר. הארכיאולוגים מוצאים ממצאים רבים המספרים על חייהם - כלי חרס, מטבעות, וכתובות עתיקות.",
    "הטכנולוגיה משנה את חיינו בקצב מהיר. מחשבים וטלפונים חכמים הפכו לחלק בלתי נפרד מהיומיום. אנחנו יכולים לתקשר עם אנשים בכל העולם, ללמוד נושאים חדשים, ולעבוד מכל מקום. אבל חשוב גם לזכור לצאת החוצה ולפגוש אנשים פנים אל פנים."
  ];

  let texts: string[];
  if (classLevel <= 3) {
    texts = easyTexts;
  } else if (classLevel <= 7) {
    texts = mediumTexts;
  } else {
    texts = hardTexts;
  }

  const selectedText = texts[Math.floor(Math.random() * texts.length)];
  const sentences = selectedText.split(". ").filter(s => s.length > 0);
  
  // Split into 1-3 pages
  const numPages = Math.min(3, Math.ceil(sentences.length / 2));
  const textPages: string[] = [];
  const sentencesPerPage = Math.ceil(sentences.length / numPages);
  
  for (let i = 0; i < numPages; i++) {
    const pageStart = i * sentencesPerPage;
    const pageEnd = Math.min((i + 1) * sentencesPerPage, sentences.length);
    textPages.push(sentences.slice(pageStart, pageEnd).join(". ") + ".");
  }

  // Generate questions based on the text
  const questions: Question[] = [
    {
      question: "על מה הטקסט מדבר?",
      options: ["על טבע", "על אנשים", "על בעלי חיים", "על מדע"],
      correctIndex: 1
    },
    {
      question: "כמה משפטים יש בטקסט?",
      options: ["2-3", "4-5", "6-7", "יותר מ-7"],
      correctIndex: sentences.length <= 3 ? 0 : sentences.length <= 5 ? 1 : sentences.length <= 7 ? 2 : 3
    },
    {
      question: "האם הבנת את הטקסט?",
      options: ["כן, לגמרי", "רוב הטקסט", "קצת", "לא"],
      correctIndex: 0
    }
  ];

  return { textPages, questions };
};

export const HebrewGame = () => {
  const [phase, setPhase] = useState<GamePhase>("classSelect");
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<number>(300);
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

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem("hebrewGameState");
    if (saved) {
      setGameState(JSON.parse(saved));
    }
  }, []);

  // Timer
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
      if (diff > 0 && currentPage < round.textPages.length - 1) {
        // Swipe left - next page
        setCurrentPage(prev => prev + 1);
      } else if (diff < 0 && currentPage > 0) {
        // Swipe right - previous page
        setCurrentPage(prev => prev - 1);
      } else if (diff > 0 && currentPage === round.textPages.length - 1) {
        // Last page, go to questions
        setPhase("questions");
      }
    }
  };

  const goToQuestions = () => {
    setPhase("questions");
  };

  const selectAnswer = (index: number) => {
    if (!round || showResult) return;
    
    const correct = index === round.questions[currentQuestion].correctIndex;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestion < round.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setShowResult(false);
      } else {
        finishGame();
      }
    }, 1000);
  };

  const finishGame = () => {
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    setTotalTime(timeTaken);
    
    const basePoints = correctAnswers * 15;
    const timeBonus = Math.max(0, 50 - Math.floor(timeTaken / 20));
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
      {/* Class Selection */}
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

      {/* Mode Selection */}
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

      {/* Reading */}
      {phase === "reading" && round && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="text-lg">עמוד {currentPage + 1}/{round.textPages.length}</span>
              {timedMode && (
                <span className={cn(
                  "text-lg font-bold",
                  timeLeft < 30 && "text-destructive animate-pulse"
                )}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              ref={containerRef}
              className="min-h-[300px] p-6 bg-muted/50 rounded-xl text-lg leading-relaxed cursor-grab transition-transform"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {round.textPages[currentPage]}
            </div>

            <div className="flex justify-center gap-2">
              {round.textPages.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors",
                    idx === currentPage ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              החלק שמאלה/ימינה לעבור בין עמודים
            </p>

            {currentPage === round.textPages.length - 1 && (
              <Button onClick={goToQuestions} className="w-full py-6 text-lg animate-fade-in">
                המשך לשאלות →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {phase === "questions" && round && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="text-lg">שאלה {currentQuestion + 1}/{round.questions.length}</span>
              {timedMode && (
                <span className={cn(
                  "text-lg font-bold",
                  timeLeft < 30 && "text-destructive animate-pulse"
                )}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold">{round.questions[currentQuestion].question}</p>
            </div>

            {showResult && (
              <div className={cn(
                "text-center py-4 rounded-xl animate-scale-in text-3xl font-bold",
                isCorrect ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              )}>
                {isCorrect ? "✔️" : "❌"}
              </div>
            )}

            <div className="grid gap-3">
              {round.questions[currentQuestion].options.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => selectAnswer(idx)}
                  disabled={showResult}
                  className={cn(
                    "py-4 text-lg justify-start",
                    showResult && idx === round.questions[currentQuestion].correctIndex && "bg-green-500/20 border-green-500",
                    showResult && !isCorrect && idx !== round.questions[currentQuestion].correctIndex && "opacity-50"
                  )}
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finished */}
      {phase === "finished" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center text-3xl">🎉 כל הכבוד! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="py-8 space-y-4">
              <p className="text-2xl">⏱️ זמן כולל: {formatTime(totalTime)}</p>
              <p className="text-2xl">✅ תשובות נכונות: {correctAnswers}/{round?.questions.length || 0}</p>
              <p className="text-3xl font-bold text-primary">🏆 נקודות שנצברו: {earnedPoints}</p>
            </div>
            <Button onClick={resetToMenu} className="w-full py-6 text-lg">
              חזור לתפריט
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Time Up */}
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
