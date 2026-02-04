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

// Simple English stories - easier than Hebrew, appropriate for Israeli students learning English
const getStoriesForClass = (classLevel: number): Story[] => {
  // Classes א-ב (1-2): Very basic English
  if (classLevel <= 1) {
    return [
      {
        title: "My Dog",
        pages: [
          "I have a dog. His name is Max. Max is brown and small.",
          "Max likes to run. He runs in the park. Max is happy.",
          "I love Max. Max loves me. We are best friends.",
          "Every day I play with Max. We play with a ball.",
          "At night, Max sleeps. I sleep too. Good night, Max!"
        ],
        questions: [
          { question: "What is the dog's name?", options: ["Rex", "Max", "Buddy", "Sam"], correctIndex: 1 },
          { question: "What color is the dog?", options: ["White", "Black", "Brown", "Gray"], correctIndex: 2 },
          { question: "Where does Max run?", options: ["At home", "In the park", "At school", "In the car"], correctIndex: 1 },
          { question: "What do they play with?", options: ["A toy", "A ball", "A stick", "A bone"], correctIndex: 1 },
          { question: "What does Max do at night?", options: ["Runs", "Eats", "Sleeps", "Plays"], correctIndex: 2 }
        ]
      },
      {
        title: "The Red Apple",
        pages: [
          "This is an apple. The apple is red. It is big.",
          "I like apples. Apples are sweet. They are good to eat.",
          "Mom gives me an apple. I say thank you.",
          "I eat the apple. Yum yum! It is very good.",
          "Now the apple is gone. I want more apples!"
        ],
        questions: [
          { question: "What color is the apple?", options: ["Green", "Yellow", "Red", "Blue"], correctIndex: 2 },
          { question: "How does the apple taste?", options: ["Sour", "Sweet", "Salty", "Bitter"], correctIndex: 1 },
          { question: "Who gives the apple?", options: ["Dad", "Mom", "Sister", "Friend"], correctIndex: 1 },
          { question: "What does the child say?", options: ["Hello", "Goodbye", "Thank you", "Please"], correctIndex: 2 },
          { question: "How is the apple?", options: ["Bad", "Good", "Small", "Green"], correctIndex: 1 }
        ]
      }
    ];
  }
  
  // Classes ג-ד (3-4): Simple sentences
  if (classLevel <= 3) {
    return [
      {
        title: "A Day at School",
        pages: [
          "Today is Monday. I go to school. My bag is blue. I have books in my bag.",
          "At school, I see my friends. We say hello. My teacher is nice. Her name is Mrs. Green.",
          "In class, we learn math. Math is fun. I like numbers. We also learn English.",
          "At lunch, I eat a sandwich. It has cheese. I drink water. My friend eats pizza.",
          "After school, I go home. I do my homework. Then I play outside. I love school!"
        ],
        questions: [
          { question: "What day is it?", options: ["Sunday", "Monday", "Friday", "Saturday"], correctIndex: 1 },
          { question: "What color is the bag?", options: ["Red", "Green", "Blue", "Yellow"], correctIndex: 2 },
          { question: "What is the teacher's name?", options: ["Mrs. Blue", "Mrs. Green", "Mrs. Red", "Mrs. White"], correctIndex: 1 },
          { question: "What does the child eat for lunch?", options: ["Pizza", "Salad", "Sandwich", "Soup"], correctIndex: 2 },
          { question: "What does the child do after homework?", options: ["Sleeps", "Eats", "Plays outside", "Watches TV"], correctIndex: 2 }
        ]
      },
      {
        title: "The Birthday Party",
        pages: [
          "Today is my birthday! I am seven years old. My family makes a party for me.",
          "My friends come to the party. They bring presents. I am very happy!",
          "We have a big cake. The cake is chocolate. It has seven candles on it.",
          "I blow the candles. Everyone sings Happy Birthday. We eat cake together.",
          "I open my presents. I get toys and books. Thank you, everyone! Best birthday ever!"
        ],
        questions: [
          { question: "How old is the child?", options: ["Five", "Six", "Seven", "Eight"], correctIndex: 2 },
          { question: "What do friends bring?", options: ["Food", "Presents", "Clothes", "Money"], correctIndex: 1 },
          { question: "What flavor is the cake?", options: ["Vanilla", "Strawberry", "Chocolate", "Lemon"], correctIndex: 2 },
          { question: "How many candles are on the cake?", options: ["Five", "Six", "Seven", "Eight"], correctIndex: 2 },
          { question: "What presents does the child get?", options: ["Clothes", "Toys and books", "Money", "Food"], correctIndex: 1 }
        ]
      }
    ];
  }
  
  // Classes ה-ו (5-6): Short paragraphs
  if (classLevel <= 5) {
    return [
      {
        title: "The Lost Kitten",
        pages: [
          "One day, a little girl named Emma found a kitten in the park. The kitten was small and gray. It looked lost and scared.",
          "Emma took the kitten home. She gave it milk and food. The kitten was very hungry. It ate everything quickly.",
          "Emma put up posters in the neighborhood. The posters said: Found - Gray Kitten. Please call if this is your cat.",
          "After two days, a boy came to Emma's house. He was very happy. The kitten was his! Its name was Whiskers.",
          "The boy thanked Emma many times. Emma was happy to help. She learned that helping others feels very good."
        ],
        questions: [
          { question: "Where did Emma find the kitten?", options: ["At school", "In the park", "At home", "In a store"], correctIndex: 1 },
          { question: "What color was the kitten?", options: ["White", "Black", "Orange", "Gray"], correctIndex: 3 },
          { question: "What did Emma do to find the owner?", options: ["Called the police", "Put up posters", "Asked her friends", "Did nothing"], correctIndex: 1 },
          { question: "What was the kitten's name?", options: ["Fluffy", "Whiskers", "Max", "Lucky"], correctIndex: 1 },
          { question: "What did Emma learn?", options: ["Cats are cute", "Finding pets is easy", "Helping others feels good", "Posters are fun to make"], correctIndex: 2 }
        ]
      },
      {
        title: "The Science Project",
        pages: [
          "Tom and his partner Lisa had to do a science project for school. They decided to grow plants. They wanted to see what plants need to grow.",
          "They put seeds in three different pots. One pot had water and sunlight. One had only water. One had only sunlight.",
          "After one week, they checked the pots. The plant with water and sunlight was growing well. It was green and tall.",
          "The plant with only water was yellow and weak. The plant with only sunlight was dry and dead. The experiment showed that plants need both water and light.",
          "Tom and Lisa presented their project to the class. Everyone was impressed. They got an A+ on their project!"
        ],
        questions: [
          { question: "What was the science project about?", options: ["Animals", "Growing plants", "Weather", "Rocks"], correctIndex: 1 },
          { question: "How many pots did they use?", options: ["Two", "Three", "Four", "Five"], correctIndex: 1 },
          { question: "Which plant grew the best?", options: ["Only water", "Only sunlight", "Water and sunlight", "No water or light"], correctIndex: 2 },
          { question: "What happened to the plant with only sunlight?", options: ["Grew tall", "Turned yellow", "Died", "Turned red"], correctIndex: 2 },
          { question: "What grade did they get?", options: ["B", "A", "A+", "C"], correctIndex: 2 }
        ]
      }
    ];
  }
  
  // Classes ז-ח (7-8): More complex stories
  if (classLevel <= 7) {
    return [
      {
        title: "The New Student",
        pages: [
          "Sarah was nervous on her first day at the new school. Her family had just moved to a new city, and she didn't know anyone. Everything felt strange and unfamiliar.",
          "During lunch break, Sarah sat alone in the cafeteria. She felt lonely and missed her old friends. A girl with curly hair walked up to her table.",
          "'Hi, I'm Maya. You're new here, right? Would you like to sit with us?' Maya asked with a warm smile. Sarah felt a wave of relief.",
          "Maya introduced Sarah to her friends. They talked about their favorite music, movies, and hobbies. Sarah discovered that she had a lot in common with them.",
          "By the end of the day, Sarah felt much better. She realized that new beginnings can be scary, but they can also bring wonderful new friendships."
        ],
        questions: [
          { question: "Why was Sarah nervous?", options: ["She had a test", "It was her first day at a new school", "She lost her lunch", "She was sick"], correctIndex: 1 },
          { question: "How did Sarah feel during lunch?", options: ["Happy", "Excited", "Lonely", "Angry"], correctIndex: 2 },
          { question: "Who talked to Sarah?", options: ["A teacher", "A boy named Tom", "A girl named Maya", "The principal"], correctIndex: 2 },
          { question: "What did they talk about?", options: ["Homework", "Sports", "Music, movies, and hobbies", "The weather"], correctIndex: 2 },
          { question: "What did Sarah learn?", options: ["To avoid new people", "New beginnings can bring new friends", "To sit alone", "To go back home"], correctIndex: 1 }
        ]
      }
    ];
  }
  
  // Classes ט-יא (9-11): Advanced stories
  return [
    {
      title: "The Unexpected Journey",
      pages: [
        "Daniel had always dreamed of traveling, but he never thought he would actually do it. Then one day, he won a contest at school - the prize was a trip to London for two weeks.",
        "At first, Daniel was excited but also scared. He had never been on a plane before, and he didn't know what to expect. His parents encouraged him to take this opportunity.",
        "During the trip, Daniel visited famous places like Big Ben and the British Museum. He tried fish and chips for the first time. He even made friends from different countries at his hotel.",
        "The most important lesson Daniel learned was about himself. He discovered that he was braver than he thought. Sometimes we need to step out of our comfort zone to grow.",
        "When Daniel returned home, he was a different person. He started learning new languages and planning future adventures. The journey had changed his perspective on life."
      ],
      questions: [
        { question: "How did Daniel win the trip?", options: ["He bought a ticket", "He won a contest", "His parents gave him", "He saved money"], correctIndex: 1 },
        { question: "What was Daniel afraid of?", options: ["Heights", "Flying on a plane", "Speaking English", "Being alone"], correctIndex: 1 },
        { question: "What did Daniel try for the first time?", options: ["Pizza", "Sushi", "Fish and chips", "Hamburgers"], correctIndex: 2 },
        { question: "What did Daniel learn about himself?", options: ["He likes food", "He was braver than he thought", "He prefers home", "He doesn't like travel"], correctIndex: 1 },
        { question: "How did the trip change Daniel?", options: ["He became scared", "He stopped dreaming", "He started learning languages and planning adventures", "He stayed the same"], correctIndex: 2 }
      ]
    },
    {
      title: "The Digital Dilemma",
      pages: [
        "Emma spent most of her free time on social media. She loved seeing what her friends were doing and posting her own photos. But lately, something felt wrong.",
        "She noticed that looking at other people's perfect pictures made her feel bad about herself. Why did everyone else seem so happy and beautiful while she felt ordinary?",
        "One day, Emma talked to her older sister about her feelings. Her sister explained that social media only shows the best moments - not real life. Nobody's life is perfect.",
        "Emma decided to do an experiment. She put away her phone for one week and focused on real activities - reading, spending time with family, and going outside.",
        "After the week, Emma felt much better. She learned that real happiness comes from living life, not from comparing herself to others online. She still uses social media, but now in a healthier way."
      ],
      questions: [
        { question: "What did Emma spend most of her time doing?", options: ["Reading", "Exercising", "On social media", "Cooking"], correctIndex: 2 },
        { question: "How did social media make Emma feel?", options: ["Always happy", "Bad about herself", "Excited", "Bored"], correctIndex: 1 },
        { question: "What did Emma's sister explain?", options: ["Social media is great", "Social media shows real life", "Social media only shows the best moments", "Social media is fake"], correctIndex: 2 },
        { question: "What was Emma's experiment?", options: ["Post more photos", "Use phone more", "Put away phone for a week", "Delete social media"], correctIndex: 2 },
        { question: "What did Emma learn?", options: ["Social media is bad", "Real happiness comes from living life", "She should never use phones", "Comparing is good"], correctIndex: 1 }
      ]
    }
  ];
};

const generateRound = (classLevel: number): ReadingRound => {
  const stories = getStoriesForClass(classLevel);
  const selectedStory = stories[Math.floor(Math.random() * stories.length)];
  return { story: selectedStory };
};

export const EnglishGame = () => {
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
    const saved = localStorage.getItem("englishGameState");
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
    
    const basePoints = correctAnswers * 15;
    const timeBonus = Math.max(0, 40 - Math.floor(timeTaken / 30));
    const points = basePoints + timeBonus;
    setEarnedPoints(points);
    
    const newState = {
      totalPoints: gameState.totalPoints + points,
      gamesPlayed: gameState.gamesPlayed + 1
    };
    setGameState(newState);
    localStorage.setItem("englishGameState", JSON.stringify(newState));
    
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
            <CardTitle className="text-center text-2xl">🇬🇧 משחק אנגלית</CardTitle>
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
            <CardTitle className="text-center text-2xl">🇬🇧 משחק אנגלית - כיתה {CLASS_LEVELS[selectedClass]}</CardTitle>
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
              <span className="text-lg font-bold" dir="ltr">{round.story.title}</span>
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
              dir="ltr"
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
            <div className="text-center py-6 bg-muted/50 rounded-xl" dir="ltr">
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
                  dir="ltr"
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
