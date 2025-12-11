import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_SPEED = 1000;

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[1, 1, 1], [0, 1, 0]], // T
  [[1, 1, 1], [1, 0, 0]], // L
  [[1, 1, 1], [0, 0, 1]], // J
  [[1, 1, 0], [0, 1, 1]], // S
  [[0, 1, 1], [1, 1, 0]], // Z
];

const COLORS = ['#00F0F0', '#F0F000', '#A000F0', '#F0A000', '#0000F0', '#00F000', '#F00000'];

type Board = number[][];
type Position = { x: number; y: number };

const createEmptyBoard = (): Board => 
  Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));

export const TetrisGame = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<number[][]>([]);
  const [currentPos, setCurrentPos] = useState<Position>({ x: 4, y: 0 });
  const [currentColor, setCurrentColor] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const isMobile = useIsMobile();

  const spawnPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    setCurrentPiece(SHAPES[shapeIndex]);
    setCurrentColor(shapeIndex + 1);
    setCurrentPos({ x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 });
  }, []);

  const isValidMove = useCallback((piece: number[][], pos: Position, boardState: Board) => {
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (
            newX < 0 || 
            newX >= BOARD_WIDTH || 
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && boardState[newY][newX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const rotatePiece = useCallback((piece: number[][]) => {
    const rotated = piece[0].map((_, i) => 
      piece.map(row => row[i]).reverse()
    );
    return rotated;
  }, []);

  const mergePiece = useCallback((boardState: Board, piece: number[][], pos: Position, color: number) => {
    const newBoard = boardState.map(row => [...row]);
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x] && pos.y + y >= 0) {
          newBoard[pos.y + y][pos.x + x] = color;
        }
      }
    }
    return newBoard;
  }, []);

  const clearLines = useCallback((boardState: Board) => {
    let linesCleared = 0;
    const newBoard = boardState.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    return { newBoard, linesCleared };
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (gameOver || isPaused) return;

    const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };
    if (isValidMove(currentPiece, newPos, board)) {
      setCurrentPos(newPos);
    } else if (dy > 0) {
      const mergedBoard = mergePiece(board, currentPiece, currentPos, currentColor);
      const { newBoard, linesCleared } = clearLines(mergedBoard);
      
      setBoard(newBoard);
      setScore(prev => prev + linesCleared * 100 * level);
      
      if (linesCleared > 0 && score > 0 && score % 500 === 0) {
        setLevel(prev => prev + 1);
        setSpeed(prev => Math.max(100, prev - 100));
      }

      spawnPiece();
      
      if (!isValidMove(SHAPES[Math.floor(Math.random() * SHAPES.length)], { x: 4, y: 0 }, newBoard)) {
        setGameOver(true);
      }
    }
  }, [board, currentPiece, currentPos, currentColor, gameOver, isPaused, isValidMove, mergePiece, clearLines, spawnPiece, level, score]);

  const handleRotate = useCallback(() => {
    if (gameOver || isPaused) return;
    const rotated = rotatePiece(currentPiece);
    if (isValidMove(rotated, currentPos, board)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, currentPos, board, gameOver, isPaused, rotatePiece, isValidMove]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          movePiece(0, 1);
          break;
        case 'ArrowUp':
        case ' ':
          handleRotate();
          break;
        case 'p':
        case 'P':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePiece, handleRotate, gameOver]);

  useEffect(() => {
    if (currentPiece.length === 0) {
      spawnPiece();
    }
  }, [currentPiece, spawnPiece]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const interval = setInterval(() => {
      movePiece(0, 1);
    }, speed);

    return () => clearInterval(interval);
  }, [speed, movePiece, gameOver, isPaused]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(1);
    setSpeed(INITIAL_SPEED);
    setGameOver(false);
    setIsPaused(false);
    spawnPiece();
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    if (currentPiece.length > 0) {
      for (let y = 0; y < currentPiece.length; y++) {
        for (let x = 0; x < currentPiece[y].length; x++) {
          if (currentPiece[y][x] && currentPos.y + y >= 0) {
            displayBoard[currentPos.y + y][currentPos.x + x] = currentColor;
          }
        }
      }
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={`${y}-${x}`}
            className="w-6 h-6 border border-gray-700"
            style={{
              backgroundColor: cell ? COLORS[cell - 1] : '#1a1a1a',
            }}
          />
        ))}
      </div>
    ));
  };

  // Touch control handlers
  const handleTouchLeft = () => movePiece(-1, 0);
  const handleTouchRight = () => movePiece(1, 0);
  const handleTouchDown = () => movePiece(0, 1);
  const handleTouchRotate = () => handleRotate();

  return (
    <div className="flex justify-center items-center min-h-[600px] p-4" dir="rtl">
      <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-6`}>
        <Card className="p-4 md:p-6 bg-card">
          <h2 className="text-2xl font-bold mb-4 text-center">טטריס</h2>
          
          <div className="mb-4 space-y-2 text-center">
            <div className="text-lg">ניקוד: <span className="font-bold">{score}</span></div>
            <div className="text-lg">שלב: <span className="font-bold">{level}</span></div>
          </div>

          <div className="border-4 border-primary mb-4 mx-auto" style={{ width: "fit-content" }}>
            {renderBoard()}
          </div>

          <div className="space-y-2">
            {gameOver ? (
              <Button onClick={resetGame} className="w-full">
                משחק חדש
              </Button>
            ) : (
              <Button onClick={() => setIsPaused(!isPaused)} className="w-full">
                {isPaused ? 'המשך' : 'השהה'}
              </Button>
            )}
          </div>

          {gameOver && (
            <div className="mt-4 text-center text-destructive font-bold">
              המשחק הסתיים!
            </div>
          )}

          {/* Mobile Touch Controls */}
          {isMobile && !gameOver && (
            <div className="mt-6 space-y-3">
              <div className="text-center text-sm text-muted-foreground mb-2">בקרות מגע</div>
              
              {/* Top row - Rotate */}
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-24 h-12 text-lg font-bold bg-primary/20 hover:bg-primary/40 active:bg-primary/60"
                  onClick={handleTouchRotate}
                  disabled={isPaused}
                >
                  🔄 סיבוב
                </Button>
              </div>
              
              {/* Middle row - Left and Right */}
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-20 h-14 text-lg font-bold bg-blue-500/20 hover:bg-blue-500/40 active:bg-blue-500/60"
                  onClick={handleTouchRight}
                  disabled={isPaused}
                >
                  ימינה ➡️
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-20 h-14 text-lg font-bold bg-blue-500/20 hover:bg-blue-500/40 active:bg-blue-500/60"
                  onClick={handleTouchLeft}
                  disabled={isPaused}
                >
                  ⬅️ שמאלה
                </Button>
              </div>
              
              {/* Bottom row - Down */}
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-24 h-12 text-lg font-bold bg-orange-500/20 hover:bg-orange-500/40 active:bg-orange-500/60"
                  onClick={handleTouchDown}
                  disabled={isPaused}
                >
                  ⬇️ למטה
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Instructions card - hide on mobile to save space */}
        {!isMobile && (
          <Card className="p-6 bg-card max-w-xs">
            <h3 className="text-xl font-bold mb-4">הוראות</h3>
            <div className="space-y-2 text-sm">
              <p><strong>⬅️ ➡️</strong> - הזז ימינה/שמאלה</p>
              <p><strong>⬇️</strong> - האץ נפילה</p>
              <p><strong>⬆️ / רווח</strong> - סובב</p>
              <p><strong>P</strong> - השהה</p>
              <p className="mt-4 pt-4 border-t">
                מטרה: מלא שורות שלמות כדי לקבל נקודות ולעלות רמות!
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
