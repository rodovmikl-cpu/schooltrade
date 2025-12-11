import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface Monster {
  x: number;
  y: number;
  id: number;
}

export const HauntedCountry = () => {
  const [level, setLevel] = useState(1);
  const [bestLevel, setBestLevel] = useState(() => {
    return parseInt(localStorage.getItem('halloween-haunted-school-best-level') || '1');
  });
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [exitPos] = useState({ x: 8, y: 8 });
  const [gameActive, setGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [walls, setWalls] = useState<Set<string>>(new Set());
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (level > bestLevel) {
      setBestLevel(level);
      localStorage.setItem('halloween-haunted-school-best-level', level.toString());
    }
  }, [level, bestLevel]);

  useEffect(() => {
    if (!gameActive) return;

    const monsterSpeed = Math.max(400, 800 - (level * 60));
    const monsterInterval = setInterval(() => {
      setMonsters(prev => prev.map(monster => {
        const dx = playerPos.x - monster.x;
        const dy = playerPos.y - monster.y;
        
        let newX = monster.x;
        let newY = monster.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          newX = monster.x + (dx > 0 ? 1 : -1);
        } else {
          newY = monster.y + (dy > 0 ? 1 : -1);
        }
        
        newX = Math.max(0, Math.min(9, newX));
        newY = Math.max(0, Math.min(9, newY));
        
        const wallKey = `${newX},${newY}`;
        if (walls.has(wallKey)) {
          return monster;
        }
        
        return { ...monster, x: newX, y: newY };
      }));
    }, monsterSpeed);

    return () => clearInterval(monsterInterval);
  }, [gameActive, level, walls, playerPos]);

  useEffect(() => {
    const closeMonsters = monsters.filter(m => {
      const distance = Math.abs(m.x - playerPos.x) + Math.abs(m.y - playerPos.y);
      return distance <= 2;
    });

    if (closeMonsters.length > 0 && gameActive) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.src = 'https://assets.mixkit.co/active_storage/sfx/2466/2466-preview.mp3';
        audioRef.current.volume = 0.3;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [monsters, playerPos, gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const touchingMonster = monsters.some(m => m.x === playerPos.x && m.y === playerPos.y);
    if (touchingMonster) {
      setGameActive(false);
      setGameOver(true);
      setLevel(1);
    }

    if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
      setShowWinAnimation(true);
      setTimeout(() => {
        setLevel(prev => prev + 1);
        setShowWinAnimation(false);
        startGame();
      }, 1500);
    }
  }, [playerPos, exitPos, gameActive, monsters]);

  const move = (dx: number, dy: number) => {
    const newX = Math.max(0, Math.min(9, playerPos.x + dx));
    const newY = Math.max(0, Math.min(9, playerPos.y + dy));
    
    const wallKey = `${newX},${newY}`;
    if (walls.has(wallKey)) return;

    const monsterBlocking = monsters.some(m => m.x === newX && m.y === newY);
    if (monsterBlocking) return;

    setPlayerPos({ x: newX, y: newY });
    setMoves(prev => prev + 1);
  };

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setPlayerPos({ x: 1, y: 1 });
    setMoves(0);

    const numMonsters = Math.min(2 + level, 8);
    const newMonsters: Monster[] = [];
    for (let i = 0; i < numMonsters; i++) {
      newMonsters.push({
        x: Math.floor(Math.random() * 8) + 1,
        y: Math.floor(Math.random() * 8) + 1,
        id: i,
      });
    }
    setMonsters(newMonsters);

    const newWalls = new Set<string>();
    const numWalls = Math.min(10 + level * 3, 30);
    for (let i = 0; i < numWalls; i++) {
      const wx = Math.floor(Math.random() * 10);
      const wy = Math.floor(Math.random() * 10);
      if ((wx !== 1 || wy !== 1) && (wx !== 8 || wy !== 8)) {
        newWalls.add(`${wx},${wy}`);
      }
    }
    setWalls(newWalls);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto space-y-4" dir="rtl">
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-orange-400">
          הרמה שלך: {level} | השיא שלך: {bestLevel} | מהלכים: {moves}
        </div>
        {gameOver && (
          <div className="text-xl text-red-400 animate-fade-in">
            הרוח תפסה אותך! מתחילים מרמה 1
          </div>
        )}
      </div>

      {showWinAnimation && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 rounded-lg animate-fade-in">
          <div className="text-6xl animate-scale-in">
            🎃✨🚪
          </div>
        </div>
      )}

      <div className="grid grid-cols-10 gap-1 bg-black p-2 rounded-lg border-2 border-orange-500">
        {Array.from({ length: 100 }, (_, i) => {
          const x = i % 10;
          const y = Math.floor(i / 10);
          const isPlayer = playerPos.x === x && playerPos.y === y;
          const isExit = exitPos.x === x && exitPos.y === y;
          const isMonster = monsters.some(m => m.x === x && m.y === y);
          const isWall = walls.has(`${x},${y}`);

          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center text-2xl rounded transition-colors ${
                isPlayer
                  ? 'bg-blue-500'
                  : isExit
                  ? 'bg-green-500 animate-pulse'
                  : isMonster
                  ? 'bg-red-500/80'
                  : isWall
                  ? 'bg-gray-700'
                  : 'bg-gray-900'
              }`}
            >
              {isPlayer && '🏃'}
              {isExit && '🚪'}
              {isMonster && '👻'}
            </div>
          );
        })}
      </div>

      {!gameActive ? (
        <div className="flex justify-center">
          <Button
            onClick={startGame}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl px-8 py-4"
          >
            🏫 {gameOver ? 'נסה שוב' : `רמה ${level}`}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          <div />
          <Button onClick={() => move(0, -1)} variant="outline" size="lg">⬆️</Button>
          <div />
          <Button onClick={() => move(-1, 0)} variant="outline" size="lg">⬅️</Button>
          <div />
          <Button onClick={() => move(1, 0)} variant="outline" size="lg">➡️</Button>
          <div />
          <Button onClick={() => move(0, 1)} variant="outline" size="lg">⬇️</Button>
          <div />
        </div>
      )}
    </div>
  );
};
