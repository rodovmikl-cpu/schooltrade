import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Pumpkin {
  id: number;
  x: number;
  y: number;
  speed: number;
  isAngry: boolean;
}

export const PumpkinNight = () => {
  const [score, setScore] = useState(() => {
    return parseInt(localStorage.getItem('halloween-pumpkin-night-score') || '0');
  });
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('halloween-pumpkin-night-best') || '0');
  });
  const [pumpkins, setPumpkins] = useState<Pumpkin[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerPos, setPlayerPos] = useState(50);

  useEffect(() => {
    localStorage.setItem('halloween-pumpkin-night-score', score.toString());
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('halloween-pumpkin-night-best', score.toString());
    }
  }, [score, bestScore]);

  useEffect(() => {
    if (!gameActive) return;

    const spawnInterval = setInterval(() => {
      const newPumpkin: Pumpkin = {
        id: Date.now(),
        x: Math.random() * 90 + 5,
        y: -10,
        speed: Math.random() * 2 + 1,
        isAngry: Math.random() > 0.7,
      };
      setPumpkins(prev => [...prev, newPumpkin]);
    }, 1200);

    const moveInterval = setInterval(() => {
      setPumpkins(prev => {
        const updated = prev
          .map(p => ({ ...p, y: p.y + p.speed }))
          .filter(p => p.y < 100);

        // Check collision with player
        updated.forEach(p => {
          if (p.isAngry && Math.abs(p.x - playerPos) < 8 && p.y > 80 && p.y < 95) {
            setGameActive(false);
            setGameOver(true);
          }
        });

        return updated;
      });
    }, 50);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(moveInterval);
    };
  }, [gameActive, playerPos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPlayerPos(x);
  };

  const clickPumpkin = (id: number, isAngry: boolean) => {
    setPumpkins(prev => prev.filter(p => p.id !== id));
    if (!isAngry) {
      setScore(prev => prev + 10);
    }
  };

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setPumpkins([]);
    setPlayerPos(50);
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-orange-400">
          ניקוד: {score} | השיא שלך: {bestScore}
        </div>
        <p className="text-sm text-gray-300">
          הימנע מדלעות כועסות 😡 ותפוס דלעות רגילות 🎃
        </p>
      </div>

      <div 
        className="relative w-full h-[600px] bg-gradient-to-b from-purple-900 via-black to-orange-900 rounded-lg overflow-hidden border-2 border-orange-500"
        onMouseMove={handleMouseMove}
      >
        {!gameActive ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            {gameOver && (
              <div className="text-6xl animate-scale-in mb-4">
                💥
                <div className="text-2xl text-red-400 mt-4">הפסדת! נסה שוב</div>
              </div>
            )}
            <Button
              onClick={startGame}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xl px-8 py-6"
            >
              🎃 {gameOver ? 'התחל מחדש' : 'התחל משחק'}
            </Button>
          </div>
        ) : (
          <>
            {/* Player */}
            <div
              className="absolute bottom-4 text-5xl transition-all duration-100"
              style={{
                left: `${playerPos}%`,
                transform: 'translateX(-50%)',
              }}
            >
              🏃
            </div>

            {/* Pumpkins */}
            {pumpkins.map(pumpkin => (
              <button
                key={pumpkin.id}
                onClick={() => clickPumpkin(pumpkin.id, pumpkin.isAngry)}
                className="absolute text-5xl cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${pumpkin.x}%`,
                  top: `${pumpkin.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {pumpkin.isAngry ? '😡' : '🎃'}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
