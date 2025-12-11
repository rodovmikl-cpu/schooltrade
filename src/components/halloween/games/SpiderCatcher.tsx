import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Spider {
  id: number;
  x: number;
  y: number;
}

export const SpiderCatcher = () => {
  const [score, setScore] = useState(() => {
    return parseInt(localStorage.getItem('halloween-spider-catcher-score') || '0');
  });
  const [level, setLevel] = useState(1);
  const [spiders, setSpiders] = useState<Spider[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [spidersLeftInLevel, setSpidersLeftInLevel] = useState(0);
  const [showWeb, setShowWeb] = useState(true);

  useEffect(() => {
    localStorage.setItem('halloween-spider-catcher-score', score.toString());
  }, [score]);

  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          setLevel(1);
          return 10;
        }
        if (prev <= 4) {
          setShowWeb(false);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  const startGame = () => {
    setGameActive(true);
    setTimeLeft(10);
    setShowWeb(true);
    
    const numSpiders = Math.min(8 + level * 3, 25);
    setSpidersLeftInLevel(numSpiders);
    
    const newSpiders: Spider[] = [];
    for (let i = 0; i < numSpiders; i++) {
      newSpiders.push({
        id: Date.now() + i,
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
      });
    }
    
    setSpiders(newSpiders);
  };

  const catchSpider = (id: number) => {
    if (!showWeb) return;
    
    setSpiders(prev => prev.filter(s => s.id !== id));
    setScore(prev => prev + 1);
    setSpidersLeftInLevel(prev => {
      const newLeft = prev - 1;
      if (newLeft === 0) {
        setTimeout(() => {
          setLevel(l => l + 1);
          startGame();
        }, 500);
      }
      return newLeft;
    });
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-orange-400">
          ניקוד: {score} | רמה: {level} | זמן: {timeLeft}s
        </div>
        <p className="text-sm text-gray-300">
          תפוס את כל העכבישים לפני שהרשת נעלמת! {!showWeb && '⚠️ הרשת נעלמה!'}
        </p>
      </div>

      <div className="relative w-full h-[600px] bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-lg overflow-hidden border-2 border-purple-500">
        {/* Web Background */}
        {showWeb && (
          <div 
            className="absolute inset-0 opacity-20 transition-opacity duration-1000"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px),
                repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px),
                repeating-linear-gradient(45deg, transparent, transparent 70px, rgba(255,255,255,0.05) 70px, rgba(255,255,255,0.05) 71px),
                repeating-linear-gradient(-45deg, transparent, transparent 70px, rgba(255,255,255,0.05) 70px, rgba(255,255,255,0.05) 71px)
              `
            }}
          />
        )}

        {!gameActive ? (
          <div className="flex items-center justify-center h-full">
            <Button
              onClick={startGame}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xl px-8 py-6"
            >
              🕷️ תפוס עכבישים!
            </Button>
          </div>
        ) : (
          <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-xl font-bold bg-black/50 px-4 py-2 rounded-lg">
              עכבישים שנותרו: {spidersLeftInLevel}
            </div>

            {spiders.map(spider => (
              <button
                key={spider.id}
                onClick={() => catchSpider(spider.id)}
                className={`absolute text-5xl transition-all ${
                  showWeb 
                    ? 'cursor-pointer hover:scale-125' 
                    : 'cursor-not-allowed opacity-50 animate-pulse'
                }`}
                style={{
                  left: `${spider.x}%`,
                  top: `${spider.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                🕷️
              </button>
            ))}

            {spidersLeftInLevel === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 animate-fade-in">
                <div className="text-6xl animate-scale-in">
                  🕸️✨🕸️
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
