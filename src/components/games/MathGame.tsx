import { useState, useEffect } from "react";
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
  visual?: string;
}

type GamePhase = "classSelect" | "modeSelect" | "playing" | "correction" | "finished" | "timeUp";

interface GameState {
  totalPoints: number;
  gamesPlayed: number;
}

// Israeli curriculum-based math question generator
const generateQuestion = (classLevel: number): Question => {
  const grade = classLevel + 1; // א=1, ב=2, etc.
  
  // Class א (1): Basic counting, +/- up to 10
  if (grade === 1) {
    const ops = ["+", "-"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1 = Math.floor(Math.random() * 10) + 1;
    let num2 = Math.floor(Math.random() * num1) + 1;
    if (op === "+") {
      num2 = Math.floor(Math.random() * (10 - num1)) + 1;
    }
    const answer = op === "+" ? num1 + num2 : num1 - num2;
    return {
      question: `${num1} ${op} ${num2} = ?`,
      answer,
      explanation: `${num1} ${op} ${num2} = ${answer}`
    };
  }
  
  // Class ב (2): +/- up to 20, small multiplication (×2, ×3, ×5, ×10)
  if (grade === 2) {
    const questionTypes = ["add", "sub", "mult"];
    const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    if (type === "mult") {
      const multipliers = [2, 3, 5, 10];
      const mult = multipliers[Math.floor(Math.random() * multipliers.length)];
      const num = Math.floor(Math.random() * 10) + 1;
      return {
        question: `${num} × ${mult} = ?`,
        answer: num * mult,
        explanation: `${num} × ${mult} = ${num * mult} (${num} פעמים ${mult})`
      };
    }
    
    const num1 = Math.floor(Math.random() * 15) + 5;
    const num2 = Math.floor(Math.random() * Math.min(num1, 10)) + 1;
    if (type === "add") {
      return {
        question: `${num1} + ${num2} = ?`,
        answer: num1 + num2,
        explanation: `${num1} + ${num2} = ${num1 + num2}`
      };
    }
    return {
      question: `${num1} - ${num2} = ?`,
      answer: num1 - num2,
      explanation: `${num1} - ${num2} = ${num1 - num2}`
    };
  }
  
  // Class ג (3): Multiplication tables, division, +/- up to 100
  if (grade === 3) {
    const types = ["mult", "div", "add", "sub"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "mult") {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      return {
        question: `${num1} × ${num2} = ?`,
        answer: num1 * num2,
        explanation: `לוח הכפל: ${num1} × ${num2} = ${num1 * num2}`
      };
    }
    if (type === "div") {
      const num2 = Math.floor(Math.random() * 9) + 2;
      const answer = Math.floor(Math.random() * 10) + 1;
      const num1 = num2 * answer;
      return {
        question: `${num1} ÷ ${num2} = ?`,
        answer,
        explanation: `${num1} ÷ ${num2} = ${answer} (כי ${num2} × ${answer} = ${num1})`
      };
    }
    
    const num1 = Math.floor(Math.random() * 50) + 20;
    const num2 = Math.floor(Math.random() * 30) + 10;
    if (type === "add") {
      return {
        question: `${num1} + ${num2} = ?`,
        answer: num1 + num2,
        explanation: `${num1} + ${num2} = ${num1 + num2}`
      };
    }
    return {
      question: `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`,
      answer: Math.abs(num1 - num2),
      explanation: `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ${Math.abs(num1 - num2)}`
    };
  }
  
  // Class ד (4): Fractions, larger numbers, word problems
  if (grade === 4) {
    const types = ["fraction", "mult", "div", "word"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "fraction") {
      const denominators = [2, 4, 5, 10];
      const denom = denominators[Math.floor(Math.random() * denominators.length)];
      const num = Math.floor(Math.random() * (denom - 1)) + 1;
      const whole = Math.floor(Math.random() * 5) + 1;
      const answer = whole * denom + num;
      return {
        question: `כמה ${denom}/${num} יש ב-${whole} שלמים ו-${num}/${denom}?`,
        answer,
        explanation: `${whole} שלמים = ${whole * denom}/${denom}, ועוד ${num}/${denom} = ${answer}/${denom}`
      };
    }
    if (type === "mult") {
      const num1 = Math.floor(Math.random() * 20) + 10;
      const num2 = Math.floor(Math.random() * 9) + 2;
      return {
        question: `${num1} × ${num2} = ?`,
        answer: num1 * num2,
        explanation: `${num1} × ${num2} = ${num1 * num2}`
      };
    }
    if (type === "word") {
      const items = ["תפוחים", "עפרונות", "ספרים"];
      const item = items[Math.floor(Math.random() * items.length)];
      const num1 = Math.floor(Math.random() * 8) + 3;
      const num2 = Math.floor(Math.random() * 10) + 5;
      return {
        question: `בכל שקית יש ${num2} ${item}. כמה ${item} יש ב-${num1} שקיות?`,
        answer: num1 * num2,
        explanation: `${num1} שקיות × ${num2} ${item} = ${num1 * num2} ${item}`
      };
    }
    
    const num2 = Math.floor(Math.random() * 10) + 2;
    const answer = Math.floor(Math.random() * 20) + 5;
    return {
      question: `${num2 * answer} ÷ ${num2} = ?`,
      answer,
      explanation: `${num2 * answer} ÷ ${num2} = ${answer}`
    };
  }
  
  // Class ה (5): Decimals, percentages, geometry basics
  if (grade === 5) {
    const types = ["decimal", "percent", "area", "mult"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "decimal") {
      const num1 = (Math.floor(Math.random() * 50) + 10) / 10;
      const num2 = (Math.floor(Math.random() * 30) + 10) / 10;
      const answer = Math.round((num1 + num2) * 10) / 10;
      return {
        question: `${num1} + ${num2} = ?`,
        answer: answer * 10,
        explanation: `${num1} + ${num2} = ${answer} (תשובה × 10 = ${answer * 10})`
      };
    }
    if (type === "percent") {
      const percents = [10, 20, 25, 50];
      const percent = percents[Math.floor(Math.random() * percents.length)];
      const number = Math.floor(Math.random() * 10) * 10 + 20;
      const answer = (number * percent) / 100;
      return {
        question: `כמה זה ${percent}% מ-${number}?`,
        answer,
        explanation: `${percent}% מ-${number} = ${number} × ${percent}/100 = ${answer}`
      };
    }
    if (type === "area") {
      const length = Math.floor(Math.random() * 10) + 3;
      const width = Math.floor(Math.random() * 8) + 2;
      return {
        question: `שטח מלבן: אורך ${length} ס"מ, רוחב ${width} ס"מ. מה השטח?`,
        answer: length * width,
        explanation: `שטח = אורך × רוחב = ${length} × ${width} = ${length * width} סמ"ר`,
        visual: `📏 ${length} ס"מ × ${width} ס"מ`
      };
    }
    
    const num1 = Math.floor(Math.random() * 50) + 20;
    const num2 = Math.floor(Math.random() * 30) + 10;
    return {
      question: `${num1} × ${num2} = ?`,
      answer: num1 * num2,
      explanation: `${num1} × ${num2} = ${num1 * num2}`
    };
  }
  
  // Class ו (6): Advanced fractions, ratios, volume
  if (grade === 6) {
    const types = ["ratio", "volume", "fraction_op", "equation"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "ratio") {
      const ratio1 = Math.floor(Math.random() * 4) + 1;
      const ratio2 = Math.floor(Math.random() * 4) + 1;
      const total = (ratio1 + ratio2) * (Math.floor(Math.random() * 5) + 2);
      const answer = (total / (ratio1 + ratio2)) * ratio1;
      return {
        question: `יחס בין שני מספרים הוא ${ratio1}:${ratio2}. הסכום הוא ${total}. מה המספר הראשון?`,
        answer,
        explanation: `סה"כ חלקים = ${ratio1 + ratio2}, כל חלק = ${total / (ratio1 + ratio2)}, המספר הראשון = ${answer}`
      };
    }
    if (type === "volume") {
      const l = Math.floor(Math.random() * 5) + 2;
      const w = Math.floor(Math.random() * 4) + 2;
      const h = Math.floor(Math.random() * 4) + 2;
      return {
        question: `נפח תיבה: אורך ${l}, רוחב ${w}, גובה ${h}. מה הנפח?`,
        answer: l * w * h,
        explanation: `נפח = ${l} × ${w} × ${h} = ${l * w * h}`,
        visual: `📦 ${l}×${w}×${h}`
      };
    }
    if (type === "equation") {
      const answer = Math.floor(Math.random() * 15) + 3;
      const add = Math.floor(Math.random() * 10) + 5;
      const result = answer + add;
      return {
        question: `x + ${add} = ${result}. מצא את x`,
        answer,
        explanation: `x = ${result} - ${add} = ${answer}`
      };
    }
    
    return {
      question: `1/2 + 1/4 = ? (תשובה בחלקי 4)`,
      answer: 3,
      explanation: `1/2 = 2/4, אז 2/4 + 1/4 = 3/4`
    };
  }
  
  // Class ז (7): Algebra, negative numbers, advanced geometry
  if (grade === 7) {
    const types = ["algebra", "negative", "geometry", "power"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "algebra") {
      const a = Math.floor(Math.random() * 5) + 2;
      const answer = Math.floor(Math.random() * 10) + 2;
      const b = Math.floor(Math.random() * 20) + 5;
      const result = a * answer + b;
      return {
        question: `${a}x + ${b} = ${result}. מצא את x`,
        answer,
        explanation: `${a}x = ${result} - ${b} = ${result - b}, x = ${(result - b) / a}`
      };
    }
    if (type === "negative") {
      const num1 = Math.floor(Math.random() * 20) - 10;
      const num2 = Math.floor(Math.random() * 20) - 10;
      return {
        question: `(${num1}) + (${num2}) = ?`,
        answer: num1 + num2,
        explanation: `(${num1}) + (${num2}) = ${num1 + num2}`
      };
    }
    if (type === "power") {
      const base = Math.floor(Math.random() * 5) + 2;
      const exp = Math.floor(Math.random() * 3) + 2;
      return {
        question: `${base}^${exp} = ?`,
        answer: Math.pow(base, exp),
        explanation: `${base}^${exp} = ${"×".repeat(exp - 1).split("").map(() => base).join(" × ")} = ${Math.pow(base, exp)}`
      };
    }
    
    // Triangle perimeter
    const sides = [
      Math.floor(Math.random() * 8) + 3,
      Math.floor(Math.random() * 8) + 3,
      Math.floor(Math.random() * 8) + 3
    ];
    return {
      question: `היקף משולש עם צלעות ${sides[0]}, ${sides[1]}, ${sides[2]}?`,
      answer: sides[0] + sides[1] + sides[2],
      explanation: `היקף = ${sides[0]} + ${sides[1]} + ${sides[2]} = ${sides[0] + sides[1] + sides[2]}`,
      visual: "📐 משולש"
    };
  }
  
  // Class ח (8): Linear equations, Pythagoras, statistics
  if (grade === 8) {
    const types = ["equation2", "pythagoras", "linear"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "pythagoras") {
      const pythagorean = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]];
      const triple = pythagorean[Math.floor(Math.random() * pythagorean.length)];
      const hideIdx = Math.floor(Math.random() * 3);
      const labels = ["a", "b", "c"];
      const question = hideIdx === 2
        ? `במשולש ישר זווית: a=${triple[0]}, b=${triple[1]}. מצא את c (היתר)`
        : `במשולש ישר זווית: ${labels[(hideIdx + 1) % 3]}=${triple[(hideIdx + 1) % 3]}, c=${triple[2]}. מצא את ${labels[hideIdx]}`;
      return {
        question,
        answer: triple[hideIdx],
        explanation: `משפט פיתגורס: a² + b² = c². התשובה: ${triple[hideIdx]}`,
        visual: "📐 משולש ישר זווית"
      };
    }
    if (type === "equation2") {
      const answer = Math.floor(Math.random() * 10) + 1;
      const a = Math.floor(Math.random() * 4) + 2;
      const b = Math.floor(Math.random() * 3) + 1;
      const c = Math.floor(Math.random() * 10) + 5;
      const result = a * answer - b * answer + c;
      return {
        question: `${a}x - ${b}x + ${c} = ${result}. מצא את x`,
        answer,
        explanation: `${a - b}x = ${result - c}, x = ${(result - c) / (a - b)}`
      };
    }
    
    // Linear function
    const m = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 10) - 5;
    const x = Math.floor(Math.random() * 5) + 1;
    return {
      question: `y = ${m}x + ${b}. מה y כאשר x = ${x}?`,
      answer: m * x + b,
      explanation: `y = ${m} × ${x} + ${b} = ${m * x} + ${b} = ${m * x + b}`
    };
  }
  
  // Class ט (9): Quadratics, trigonometry basics
  if (grade === 9) {
    const types = ["quadratic", "trig", "system"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "quadratic") {
      const r1 = Math.floor(Math.random() * 6) + 1;
      const r2 = Math.floor(Math.random() * 6) + 1;
      return {
        question: `x² - ${r1 + r2}x + ${r1 * r2} = 0. מה סכום הפתרונות?`,
        answer: r1 + r2,
        explanation: `הפתרונות הם x=${r1} ו-x=${r2}. הסכום: ${r1 + r2}`,
      };
    }
    if (type === "trig") {
      const special = [
        { angle: 30, sin: 0.5, cos: 0.87, tan: 0.58 },
        { angle: 45, sin: 0.71, cos: 0.71, tan: 1 },
        { angle: 60, sin: 0.87, cos: 0.5, tan: 1.73 }
      ];
      const s = special[Math.floor(Math.random() * special.length)];
      return {
        question: `tan(${s.angle}°) שווה בקירוב ל: (הכפל ב-100)`,
        answer: Math.round(s.tan * 100),
        explanation: `tan(${s.angle}°) ≈ ${s.tan}`
      };
    }
    
    // Simple system
    const x = Math.floor(Math.random() * 5) + 1;
    const y = Math.floor(Math.random() * 5) + 1;
    return {
      question: `x + y = ${x + y}, x - y = ${x - y}. מצא את x`,
      answer: x,
      explanation: `מחברים: 2x = ${2 * x}, x = ${x}`
    };
  }
  
  // Class י (10): Advanced algebra and geometry
  if (grade === 10) {
    const types = ["circle", "sequence", "function"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "circle") {
      const r = Math.floor(Math.random() * 5) + 2;
      return {
        question: `שטח מעגל עם רדיוס ${r}. (תשובה ב-π, רק המספר)`,
        answer: r * r,
        explanation: `שטח = π × r² = π × ${r}² = ${r * r}π`,
        visual: `⭕ r=${r}`
      };
    }
    if (type === "sequence") {
      const a1 = Math.floor(Math.random() * 5) + 2;
      const d = Math.floor(Math.random() * 4) + 1;
      const n = Math.floor(Math.random() * 5) + 5;
      return {
        question: `סדרה חשבונית: a₁=${a1}, d=${d}. מצא את a${n}`,
        answer: a1 + (n - 1) * d,
        explanation: `aₙ = a₁ + (n-1)d = ${a1} + ${n - 1}×${d} = ${a1 + (n - 1) * d}`
      };
    }
    
    // Function derivative concept
    const a = Math.floor(Math.random() * 4) + 1;
    const x = Math.floor(Math.random() * 3) + 1;
    return {
      question: `f(x) = ${a}x². מצא f(${x})`,
      answer: a * x * x,
      explanation: `f(${x}) = ${a} × ${x}² = ${a} × ${x * x} = ${a * x * x}`
    };
  }
  
  // Class יא (11): Advanced topics
  const types = ["derivative", "log", "complex"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  if (type === "derivative") {
    const a = Math.floor(Math.random() * 5) + 2;
    const n = Math.floor(Math.random() * 3) + 2;
    return {
      question: `נגזרת של f(x) = ${a}x^${n} היא f'(x) = ?x^${n - 1}. מצא את המקדם`,
      answer: a * n,
      explanation: `נגזרת: ${a} × ${n} = ${a * n}. f'(x) = ${a * n}x^${n - 1}`
    };
  }
  if (type === "log") {
    const bases = [2, 3, 10];
    const base = bases[Math.floor(Math.random() * bases.length)];
    const exp = Math.floor(Math.random() * 4) + 2;
    const num = Math.pow(base, exp);
    return {
      question: `log${base}(${num}) = ?`,
      answer: exp,
      explanation: `log${base}(${num}) = ${exp} (כי ${base}^${exp} = ${num})`
    };
  }
  
  // Complex quadratic
  const a = Math.floor(Math.random() * 3) + 1;
  const b = Math.floor(Math.random() * 10) + 5;
  const c = Math.floor(Math.random() * 10) + 1;
  const discriminant = b * b - 4 * a * c;
  return {
    question: `מה הדיסקרימיננטה של ${a}x² + ${b}x + ${c} = 0?`,
    answer: discriminant,
    explanation: `Δ = b² - 4ac = ${b}² - 4×${a}×${c} = ${b * b} - ${4 * a * c} = ${discriminant}`
  };
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

  useEffect(() => {
    const saved = localStorage.getItem("mathGameState");
    if (saved) {
      setGameState(JSON.parse(saved));
    }
  }, []);

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
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>📚 נושאים לפי כיתה:</p>
              <p>א-ב: חיבור, חיסור, כפל קטן</p>
              <p>ג-ד: לוח כפל, חילוק, שברים</p>
              <p>ה-ו: אחוזים, שטחים, נפחים</p>
              <p>ז-ח: אלגברה, פיתגורס, משוואות</p>
              <p>ט-יא: משוואות ריבועיות, טריגונומטריה, נגזרות</p>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="text-center py-8 bg-muted/50 rounded-xl space-y-2">
              {questions[currentQuestion]?.visual && (
                <p className="text-2xl">{questions[currentQuestion].visual}</p>
              )}
              <p className="text-3xl font-bold px-4">{questions[currentQuestion]?.question}</p>
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
