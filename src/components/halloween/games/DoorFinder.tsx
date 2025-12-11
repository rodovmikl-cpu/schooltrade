import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Monster {
  x: number;
  y: number;
}

export const DoorFinder = () => {
  const [wins, setWins] = useState(() => {
    return parseInt(localStorage.getItem('halloween-door-finder-wins') || '0');
  });
  const [level, setLevel] = useState(1);
  const [correctDoor, setCorrectDoor] = useState(0);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  const numDoors = Math.min(4 + level, 9);

  useEffect(() => {
    localStorage.setItem('halloween-door-finder-wins', wins.toString());
  }, [wins]);

  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          setShowResult('lose');
          setLevel(1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const monsterInterval = setInterval(() => {
      setMonsters(prev => prev.map(m => ({
        x: Math.max(0, Math.min(100, m.x + (Math.random() - 0.5) * 10)),
        y: Math.max(0, Math.min(100, m.y + (Math.random() - 0.5) * 10)),
      })));
    }, 500);

    return () => clearInterval(monsterInterval);
  }, [gameActive]);

  const startGame = () => {
    setGameActive(true);
    setShowResult(null);
    setCorrectDoor(Math.floor(Math.random() * numDoors));
    setTimeLeft(15);

    const numMonsters = Math.min(3 + level, 8);
    const newMonsters: Monster[] = [];
    for (let i = 0; i < numMonsters; i++) {
      newMonsters.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    }
    setMonsters(newMonsters);
  };

  const selectDoor = (doorIndex: number) => {
    if (!gameActive) return;

    if (doorIndex === correctDoor) {
      setShowResult('win');
      setWins(prev => prev + 1);
      setTimeout(() => {
        setLevel(prev => prev + 1);
        startGame();
      }, 1500);
    } else {
      setShowResult('lose');
      setGameActive(false);
      setLevel(1);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-orange-400">
          ניצחונות: {wins} | רמה: {level} | זמן: {timeLeft}s
        </div>
        <p className="text-sm text-gray-300">
          מצא את הדלת הנכונה לפני שהזמן נגמר! שים לב לרוחות שמסתובבות
        </p>
      </div>

      <div className="relative w-full h-[600px] bg-gradient-to-br from-black via-purple-900 to-black rounded-lg overflow-hidden border-2 border-orange-500">
        {!gameActive && showResult === null ? (
          <div className="flex items-center justify-center h-full">
            <Button
              onClick={startGame}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xl px-8 py-6"
            >
              🚪 מצא את הדלת!
            </Button>
          </div>
        ) : showResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-8xl animate-scale-in">
              {showResult === 'win' ? '🎉' : '💀'}
            </div>
            <div className="text-3xl font-bold text-center">
              {showResult === 'win' ? (
                <span className="text-green-400">מצאת את הדלת!</span>
              ) : (
                <span className="text-red-400">דלת לא נכונה!</span>
              )}
            </div>
            {showResult === 'lose' && (
              <Button
                onClick={startGame}
                className="bg-purple-500 hover:bg-purple-600 text-white text-xl px-8 py-6"
              >
                נסה שוב
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Monsters */}
            {monsters.map((monster, i) => (
              <div
                key={i}
                className="absolute text-5xl transition-all duration-500 pointer-events-none"
                style={{
                  left: `${monster.x}%`,
                  top: `${monster.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                👻
              </div>
            ))}

            {/* Doors */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 p-4">
                {Array.from({ length: numDoors }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => selectDoor(i)}
                    className="text-6xl hover:scale-110 transition-transform p-4 bg-black/30 rounded-lg border-2 border-orange-500/50 hover:border-orange-500"
                  >
                    🚪
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
