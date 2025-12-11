import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Ghost {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const GhostHunter = () => {
  const [caught, setCaught] = useState(() => {
    return parseInt(localStorage.getItem('halloween-ghost-hunter-caught') || '0');
  });
  const [level, setLevel] = useState(1);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [ghostsLeftInLevel, setGhostsLeftInLevel] = useState(0);

  useEffect(() => {
    localStorage.setItem('halloween-ghost-hunter-caught', caught.toString());
  }, [caught]);

  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          setLevel(1);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const moveInterval = setInterval(() => {
      setGhosts(prev => prev.map(ghost => {
        let newX = ghost.x + ghost.vx;
        let newY = ghost.y + ghost.vy;
        let newVx = ghost.vx;
        let newVy = ghost.vy;

        if (newX < 0 || newX > 100) {
          newVx = -newVx;
          newX = Math.max(0, Math.min(100, newX));
        }
        if (newY < 0 || newY > 100) {
          newVy = -newVy;
          newY = Math.max(0, Math.min(100, newY));
        }

        return { ...ghost, x: newX, y: newY, vx: newVx, vy: newVy };
      }));
    }, 50);

    return () => clearInterval(moveInterval);
  }, [gameActive]);

  const startGame = () => {
    setGameActive(true);
    setTimeLeft(20);
    
    const numGhosts = Math.min(5 + level * 2, 15);
    setGhostsLeftInLevel(numGhosts);
    
    const speed = 0.5 + level * 0.3;
    const newGhosts: Ghost[] = [];
    
    for (let i = 0; i < numGhosts; i++) {
      newGhosts.push({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
      });
    }
    
    setGhosts(newGhosts);
  };

  const catchGhost = (id: number) => {
    setGhosts(prev => prev.filter(g => g.id !== id));
    setCaught(prev => prev + 1);
    setGhostsLeftInLevel(prev => {
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
          נתפסו: {caught} | רמה: {level} | זמן: {timeLeft}s
        </div>
        <p className="text-sm text-gray-300">
          תפוס את כל הרוחות לפני שהזמן נגמר! רוחות נעות מהר יותר בכל רמה
        </p>
      </div>

      <div className="relative w-full h-[600px] bg-gradient-to-br from-purple-900 via-black to-blue-900 rounded-lg overflow-hidden border-2 border-purple-500">
        {!gameActive ? (
          <div className="flex items-center justify-center h-full">
            <Button
              onClick={startGame}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xl px-8 py-6"
            >
              👻 צא לציד רוחות!
            </Button>
          </div>
        ) : (
          <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-xl font-bold bg-black/50 px-4 py-2 rounded-lg">
              רוחות שנותרו: {ghostsLeftInLevel}
            </div>

            {ghosts.map(ghost => (
              <button
                key={ghost.id}
                onClick={() => catchGhost(ghost.id)}
                className="absolute text-5xl cursor-pointer hover:scale-125 transition-transform"
                style={{
                  left: `${ghost.x}%`,
                  top: `${ghost.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                👻
              </button>
            ))}

            {ghostsLeftInLevel === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 animate-fade-in">
                <div className="text-6xl animate-scale-in">
                  ✨🎉✨
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
