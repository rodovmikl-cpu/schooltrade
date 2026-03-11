import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;

export const SnakeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [apple, setApple] = useState<Position>({ x: 15, y: 15 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const gameLoopRef = useRef<ReturnType<typeof setInterval>>();

  const generateApple = useCallback((currentSnake: Position[]) => {
    let newApple: Position;
    do {
      newApple = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      currentSnake.some((segment) => segment.x === newApple.x && segment.y === newApple.y)
    );
    return newApple;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setDirection('RIGHT');
    setApple(generateApple(initialSnake));
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setSpeed(INITIAL_SPEED);
  }, [generateApple]);

  const checkCollision = useCallback((head: Position, body: Position[]) => {
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Check self collision
    return body.some((segment) => segment.x === head.x && segment.y === head.y);
  }, []);

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };

      switch (direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      if (checkCollision(head, prevSnake)) {
        setGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check if snake ate apple
      if (head.x === apple.x && head.y === apple.y) {
        setScore((prev) => prev + 1);
        setApple(generateApple(newSnake));
        setSpeed((prev) => Math.max(50, prev - SPEED_INCREASE));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, apple, gameOver, gameStarted, checkCollision, generateApple]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, speed);
      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      };
    }
  }, [moveSnake, speed, gameStarted, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameStarted, gameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake with smooth rounded corners and gradient
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE + 3;
      const y = segment.y * CELL_SIZE + 3;
      const size = CELL_SIZE - 6;
      const radius = 6;

      // Create gradient for snake
      const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
      if (index === 0) {
        // Head - brighter gradient
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(1, '#22c55e');
      } else {
        // Body - softer gradient
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(1, '#16a34a');
      }

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.arcTo(x + size, y, x + size, y + radius, radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.arcTo(x + size, y + size, x + size - radius, y + size, radius);
      ctx.lineTo(x + radius, y + size);
      ctx.arcTo(x, y + size, x, y + size - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add subtle glow effect to head
      if (index === 0) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw apple with smooth gradient and glow
    const appleX = apple.x * CELL_SIZE + CELL_SIZE / 2;
    const appleY = apple.y * CELL_SIZE + CELL_SIZE / 2;
    const appleRadius = CELL_SIZE / 2 - 4;

    // Create radial gradient for apple
    const appleGradient = ctx.createRadialGradient(
      appleX - 3,
      appleY - 3,
      2,
      appleX,
      appleY,
      appleRadius
    );
    appleGradient.addColorStop(0, '#fca5a5');
    appleGradient.addColorStop(0.6, '#ef4444');
    appleGradient.addColorStop(1, '#dc2626');

    ctx.beginPath();
    ctx.arc(appleX, appleY, appleRadius, 0, 2 * Math.PI);
    ctx.fillStyle = appleGradient;
    ctx.fill();

    // Add glow to apple
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [snake, apple]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" dir="rtl">
      <Card className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">🐍 משחק הנחש</h2>
          <p className="text-muted-foreground">
            השתמש בחצים במקלדת כדי לשלוט בנחש. אסוף תפוחים 🍎 והימנע מהקירות ומגופך!
          </p>
        </div>

        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">ניקוד</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">מהירות</p>
            <p className="text-2xl font-bold">{Math.round((INITIAL_SPEED - speed) / SPEED_INCREASE)}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="border-2 border-border rounded-lg shadow-2xl transition-all duration-300"
              style={{ 
                boxShadow: gameStarted && !gameOver ? '0 0 40px rgba(34, 197, 94, 0.2)' : undefined 
              }}
            />
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                <Button onClick={resetGame} size="lg">
                  התחל משחק
                </Button>
              </div>
            )}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg space-y-4">
                <h3 className="text-2xl font-bold text-destructive">המשחק נגמר!</h3>
                <p className="text-lg">הניקוד שלך: <span className="font-bold">{score}</span></p>
                <Button onClick={resetGame} size="lg">
                  שחק שוב
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="flex flex-col items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="lg"
            onClick={() => direction !== 'DOWN' && setDirection('UP')}
            disabled={!gameStarted || gameOver}
          >
            ⬆️
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => direction !== 'RIGHT' && setDirection('LEFT')}
              disabled={!gameStarted || gameOver}
            >
              ⬅️
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => direction !== 'UP' && setDirection('DOWN')}
              disabled={!gameStarted || gameOver}
            >
              ⬇️
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => direction !== 'LEFT' && setDirection('RIGHT')}
              disabled={!gameStarted || gameOver}
            >
              ➡️
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 טיפ: ככל שתאסוף יותר תפוחים, המשחק יהפוך למהיר יותר!</p>
          <p className="md:block hidden">השתמש בחצים במקלדת כדי לשלוט בנחש</p>
        </div>
      </Card>
    </div>
  );
};
