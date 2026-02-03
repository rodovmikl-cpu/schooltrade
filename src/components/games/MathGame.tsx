import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CLASS_LEVELS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא"];

const TIME_OPTIONS = [
  { label: "דקה אחת", value: 60 },
  { label: "3 דקות", value: 180 },
  { label: "5 דקות", value: 300 },
  { label: "10 דקות", value: 600 },
];

interface Question {
  question: string;
  answer: number;
  explanation: string;
}

type GamePhase = "classSelect" | "modeSelect" | "playing" | "correction" | "finished" | "timeUp";

interface GameState {
  totalPoints: number;
  gamesPlayed: number;
}

const generateQuestion = (classLevel: number): Question => {
  const operations = ["+", "-", "*", "/"];
  
  // Difficulty scales with class level
  let maxNum = 10 + (classLevel * 5);
  let allowedOps = ["+", "-"];
  
  if (classLevel >= 3) {
    allowedOps.push("*");
    maxNum = 20 + (classLevel * 10);
  }
  if (classLevel >= 5) {
    allowedOps.push("/");
    maxNum = 50 + (classLevel * 15);
  }
  if (classLevel >= 8) {
    maxNum = 100 + (classLevel * 20);
  }
  
  const op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
  let num1: number, num2: number, answer: number;
  
  switch (op) {
    case "+":
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      answer = num1 + num2;
      return {
        question: `${num1} + ${num2} = ?`,
        answer,
        explanation: `${num1} + ${num2} = ${answer}`
      };
    case "-":
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      return {
        question: `${num1} - ${num2} = ?`,
        answer,
        explanation: `${num1} - ${num2} = ${answer}`
      };
    case "*":
      num1 = Math.floor(Math.random() * Math.min(12, maxNum / 10)) + 1;
      num2 = Math.floor(Math.random() * Math.min(12, maxNum / 10)) + 1;
      answer = num1 * num2;
      return {
        question: `${num1} × ${num2} = ?`,
        answer,
        explanation: `${num1} × ${num2} = ${answer}`
      };
    case "/":
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = Math.floor(Math.random() * 10) + 1;
      num1 = num2 * answer;
      return {
        question: `${num1} ÷ ${num2} = ?`,
        answer,
        explanation: `${num1} ÷ ${num2} = ${answer}`
      };
    default:
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      answer = num1 + num2;
      return {
        question: `${num1} + ${num2} = ?`,
        answer,
        explanation: `${num1} + ${num2} = ${answer}`
      };
  }
};

export const MathGame = () => {
  const [phase, setPhase] = useState<GamePhase>("classSelect");
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<number>(180);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>({ totalPoints: 0, gamesPlayed: 0 });
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem("mathGameState");
    if (saved) {
      setGameState(JSON.parse(saved));
    }
  }, []);

  // Timer
  useEffect(() => {
    if (phase === "playing" && timedMode && timeLeft > 0) {
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
    const newQuestions = Array.from({ length: 25 }, () => generateQuestion(selectedClass));
    setQuestions(newQuestions);
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setUserAnswer("");
    setShowResult(false);
    setStartTime(Date.now());
    if (timedMode) {
      setTimeLeft(selectedTime);
    }
    setPhase("playing");
  };

  const submitAnswer = () => {
    const correct = parseInt(userAnswer) === questions[currentQuestion].answer;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
      setTimeout(() => {
        if (currentQuestion < 24) {
          setCurrentQuestion(prev => prev + 1);
          setUserAnswer("");
          setShowResult(false);
        } else {
          finishGame();
        }
      }, 1000);
    } else {
      setPhase("correction");
    }
  };

  const handleCorrection = () => {
    const correct = parseInt(userAnswer) === questions[currentQuestion].answer;
    if (correct) {
      setIsCorrect(true);
      setShowResult(true);
      setTimeout(() => {
        if (currentQuestion < 24) {
          setCurrentQuestion(prev => prev + 1);
          setUserAnswer("");
          setShowResult(false);
          setPhase("playing");
        } else {
          finishGame();
        }
      }, 1000);
    }
  };

  const finishGame = () => {
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    setTotalTime(timeTaken);
    
    // Calculate points: faster + correct = more points
    const basePoints = correctAnswers * 10;
    const timeBonus = Math.max(0, 100 - Math.floor(timeTaken / 10));
    const points = basePoints + timeBonus;
    setEarnedPoints(points);
    
    const newState = {
      totalPoints: gameState.totalPoints + points,
      gamesPlayed: gameState.gamesPlayed + 1
    };
    setGameState(newState);
    localStorage.setItem("mathGameState", JSON.stringify(newState));
    
    setPhase("finished");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetToMenu = () => {
    setPhase("modeSelect");
    setUserAnswer("");
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
            <CardTitle className="text-center text-2xl">🧮 משחק מתמטי</CardTitle>
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
            <CardTitle className="text-center text-2xl">🧮 משחק מתמטי - כיתה {CLASS_LEVELS[selectedClass]}</CardTitle>
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

      {/* Playing */}
      {(phase === "playing" || phase === "correction") && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="text-lg">שאלה {currentQuestion + 1}/25</span>
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
          <CardContent className="space-y-8">
            <div className="text-center py-12 bg-muted/50 rounded-xl">
              <p className="text-4xl font-bold">{questions[currentQuestion]?.question}</p>
            </div>

            {showResult && (
              <div className={cn(
                "text-center py-6 rounded-xl animate-scale-in text-4xl font-bold",
                isCorrect ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              )}>
                {isCorrect ? "✔️" : "❌"}
              </div>
            )}

            {phase === "correction" && !isCorrect && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-yellow-500/20 rounded-lg text-center">
                  <p className="font-medium">הסבר:</p>
                  <p className="text-lg">{questions[currentQuestion]?.explanation}</p>
                </div>
                <p className="text-center text-muted-foreground">נסה שוב לתקן את התשובה:</p>
              </div>
            )}

            <div className="flex gap-4">
              <Input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="הכנס תשובה..."
                className="text-2xl text-center py-6"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    phase === "correction" ? handleCorrection() : submitAnswer();
                  }
                }}
              />
              <Button 
                onClick={phase === "correction" ? handleCorrection : submitAnswer}
                className="px-8 py-6 text-lg"
                disabled={!userAnswer}
              >
                שלח
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finished */}
      {phase === "finished" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center text-3xl">🎉 מצוין! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="py-8 space-y-4">
              <p className="text-2xl">⏱️ זמן כולל: {formatTime(totalTime)}</p>
              <p className="text-2xl">✅ תשובות נכונות: {correctAnswers}/25</p>
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
