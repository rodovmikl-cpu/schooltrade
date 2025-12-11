import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import skin67Image from "@/assets/skin-67.png";

interface CollectibleItem {
  id: string;
  type: "tree" | "ornament" | "lights" | "gift" | "candy" | "snowflake";
  x: number;
  y: number;
  collected: boolean;
  emoji: string;
}

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  skinEmoji: string;
  isSpecial67: boolean;
  score: number;
}

interface HouseDecoration {
  type: string;
  x: number;
  y: number;
}

const ITEM_TYPES = [
  { type: "tree", emoji: "🎄", points: 10 },
  { type: "ornament", emoji: "🔴", points: 5 },
  { type: "lights", emoji: "💡", points: 8 },
  { type: "gift", emoji: "🎁", points: 15 },
  { type: "candy", emoji: "🍬", points: 3 },
  { type: "snowflake", emoji: "❄️", points: 7 },
];

export const ChristmasGame = () => {
  const { toast } = useToast();
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [items, setItems] = useState<CollectibleItem[]>([]);
  const [collectedItems, setCollectedItems] = useState<CollectibleItem[]>([]);
  const [houseDecorations, setHouseDecorations] = useState<HouseDecoration[]>([]);
  const [score, setScore] = useState(0);
  const [viewMode, setViewMode] = useState<"village" | "house">("village");
  const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
  const [hasSpecial67Skin, setHasSpecial67Skin] = useState(false);

  // Check if user has the 67 skin
  useEffect(() => {
    const saved = localStorage.getItem("christmas-calendar-2024");
    if (saved) {
      const data = JSON.parse(saved);
      setHasSpecial67Skin(data.has67Skin || false);
    }
  }, []);

  // Load saved house decorations
  useEffect(() => {
    const savedHouse = localStorage.getItem("christmas-house-2024");
    if (savedHouse) {
      setHouseDecorations(JSON.parse(savedHouse));
    }
  }, []);

  // Generate random items in the village
  const generateItems = useCallback(() => {
    const newItems: CollectibleItem[] = [];
    for (let i = 0; i < 30; i++) {
      const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      newItems.push({
        id: `item-${i}`,
        type: itemType.type as CollectibleItem["type"],
        x: Math.random() * 85 + 5,
        y: Math.random() * 70 + 15,
        collected: false,
        emoji: itemType.emoji,
      });
    }
    setItems(newItems);
  }, []);

  // Start game
  const startGame = () => {
    const savedSkins = localStorage.getItem("christmas-calendar-2024");
    let skinEmoji = "🧑";
    let isSpecial = false;
    
    if (savedSkins) {
      const data = JSON.parse(savedSkins);
      if (data.collectedSkins && data.collectedSkins.length > 0) {
        const randomSkin = data.collectedSkins[Math.floor(Math.random() * data.collectedSkins.length)];
        skinEmoji = randomSkin.emoji || "🧑";
      }
      if (data.has67Skin) {
        isSpecial = true;
        skinEmoji = "67";
      }
    }

    setPlayer({
      id: "player-1",
      name: "שחקן",
      x: 50,
      y: 50,
      skinEmoji,
      isSpecial67: isSpecial,
      score: 0,
    });
    
    generateItems();
    setGameStarted(true);
    
    // Simulate other players
    const fakeOthers: Player[] = [];
    for (let i = 0; i < 5; i++) {
      fakeOthers.push({
        id: `other-${i}`,
        name: `שחקן ${i + 2}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 70 + 15,
        skinEmoji: ["🎅", "⛄", "🦌", "🧝", "🤶"][i],
        isSpecial67: false,
        score: Math.floor(Math.random() * 100),
      });
    }
    setOtherPlayers(fakeOthers);
    
    toast({ title: "🎮 המשחק התחיל!", description: "אסוף פריטים וקשט את הבית שלך!" });
  };

  // Handle player movement
  useEffect(() => {
    if (!gameStarted || !player) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 3;
      setPlayer(prev => {
        if (!prev) return prev;
        let newX = prev.x;
        let newY = prev.y;
        
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            newY = Math.max(5, prev.y - speed);
            break;
          case "ArrowDown":
          case "s":
          case "S":
            newY = Math.min(90, prev.y + speed);
            break;
          case "ArrowLeft":
          case "a":
          case "A":
            newX = Math.max(5, prev.x - speed);
            break;
          case "ArrowRight":
          case "d":
          case "D":
            newX = Math.min(95, prev.x + speed);
            break;
        }
        
        return { ...prev, x: newX, y: newY };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, player]);

  // Check for item collection
  useEffect(() => {
    if (!player || viewMode !== "village") return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      let scoreIncrease = 0;
      let newCollected: CollectibleItem[] = [];

      for (let i = 0; i < newItems.length; i++) {
        if (!newItems[i].collected) {
          const dx = Math.abs(player.x - newItems[i].x);
          const dy = Math.abs(player.y - newItems[i].y);
          
          if (dx < 5 && dy < 5) {
            newItems[i].collected = true;
            const itemType = ITEM_TYPES.find(t => t.type === newItems[i].type);
            scoreIncrease += itemType?.points || 5;
            newCollected.push(newItems[i]);
          }
        }
      }

      if (scoreIncrease > 0) {
        setScore(prev => prev + scoreIncrease);
        setCollectedItems(prev => [...prev, ...newCollected]);
      }

      return newItems;
    });
  }, [player?.x, player?.y, viewMode]);

  // Add decoration to house
  const addToHouse = (item: CollectibleItem) => {
    const newDeco: HouseDecoration = {
      type: item.emoji,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
    };
    const newDecos = [...houseDecorations, newDeco];
    setHouseDecorations(newDecos);
    localStorage.setItem("christmas-house-2024", JSON.stringify(newDecos));
    setCollectedItems(prev => prev.filter(i => i.id !== item.id));
    toast({ title: "🏠 הקישוט נוסף לבית!", description: item.emoji });
  };

  // Mobile controls
  const handleMobileMove = (direction: "up" | "down" | "left" | "right") => {
    if (!player) return;
    const speed = 5;
    setPlayer(prev => {
      if (!prev) return prev;
      let newX = prev.x;
      let newY = prev.y;
      
      switch (direction) {
        case "up": newY = Math.max(5, prev.y - speed); break;
        case "down": newY = Math.min(90, prev.y + speed); break;
        case "left": newX = Math.max(5, prev.x - speed); break;
        case "right": newX = Math.min(95, prev.x + speed); break;
      }
      
      return { ...prev, x: newX, y: newY };
    });
  };

  if (!gameStarted) {
    return (
      <div className="space-y-6 text-center" dir="rtl">
        <h2 className="text-3xl font-bold text-green-500">🎮 משחק חג 🎮</h2>
        <p className="text-muted-foreground">
          חקור את הכפר, אסוף קישוטים וקשט את הבית שלך!
        </p>
        
        <Card className="p-6 max-w-md mx-auto bg-gradient-to-br from-red-900/30 to-green-900/30">
          <div className="space-y-4">
            <div className="text-6xl animate-bounce">🏠</div>
            <h3 className="text-xl font-bold">כיצד לשחק:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-right">
              <li>🎮 השתמש בחצים או WASD לתנועה</li>
              <li>🎁 אסוף פריטים בכפר</li>
              <li>🏠 קשט את הבית שלך</li>
              <li>👥 בקר בבתים של שחקנים אחרים</li>
              {hasSpecial67Skin && (
                <li className="text-cyan-400">⭐ יש לך את הסקין המיוחד 67!</li>
              )}
            </ul>
            <Button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700"
            >
              🎄 התחל משחק 🎄
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-600/20">
            ⭐ ניקוד: {score}
          </Badge>
          <Badge variant="outline" className="bg-blue-600/20">
            📦 פריטים: {collectedItems.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={viewMode === "village" ? "default" : "outline"}
            onClick={() => setViewMode("village")}
          >
            🏘️ כפר
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === "house" ? "default" : "outline"}
            onClick={() => setViewMode("house")}
          >
            🏠 הבית שלי
          </Button>
        </div>
      </div>

      {/* Game Area */}
      <Card 
        ref={gameRef}
        className="relative h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-b from-blue-900 to-indigo-900"
      >
        {viewMode === "village" ? (
          <>
            {/* Snow effect */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-white animate-snowfall"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                >
                  ❄️
                </div>
              ))}
            </div>

            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/30 to-transparent" />

            {/* Village buildings */}
            <div className="absolute bottom-16 left-[10%] text-4xl">🏠</div>
            <div className="absolute bottom-16 left-[30%] text-4xl">⛪</div>
            <div className="absolute bottom-16 left-[50%] text-4xl">🏡</div>
            <div className="absolute bottom-16 left-[70%] text-4xl">🛖</div>
            <div className="absolute bottom-16 left-[85%] text-4xl">🏠</div>

            {/* Items */}
            {items.filter(i => !i.collected).map(item => (
              <div
                key={item.id}
                className="absolute text-2xl transition-all duration-200 hover:scale-125 animate-float-slow"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              >
                {item.emoji}
              </div>
            ))}

            {/* Other Players */}
            {otherPlayers.map(other => (
              <div
                key={other.id}
                className="absolute text-3xl transition-all duration-300"
                style={{ left: `${other.x}%`, top: `${other.y}%` }}
              >
                <div className="relative">
                  <span className="opacity-70">{other.skinEmoji}</span>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-black/50 px-1 rounded whitespace-nowrap">
                    {other.name}
                  </div>
                </div>
              </div>
            ))}

            {/* Player */}
            {player && (
              <div
                className="absolute text-4xl transition-all duration-100 z-10"
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
              >
                <div className="relative">
                  {player.isSpecial67 ? (
                    <div className="w-12 h-12 relative">
                      <img 
                        src={skin67Image} 
                        alt="67"
                        className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]"
                      />
                      {/* Special glow effect */}
                      <div className="absolute inset-0 bg-cyan-400/30 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <span>{player.skinEmoji}</span>
                  )}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-green-600 px-2 rounded whitespace-nowrap">
                    אני
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* House View */
          <div className="relative w-full h-full bg-gradient-to-b from-amber-900/50 to-amber-800/50">
            {/* House interior */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-6xl">🏠</div>
            <div className="absolute bottom-4 left-4 text-4xl">🛋️</div>
            <div className="absolute bottom-4 right-4 text-4xl">🪵</div>
            <div className="absolute top-20 right-8 text-3xl">🖼️</div>
            
            {/* Placed decorations */}
            {houseDecorations.map((deco, i) => (
              <div
                key={i}
                className="absolute text-3xl animate-float-slow"
                style={{ left: `${deco.x}%`, top: `${deco.y}%` }}
              >
                {deco.type}
              </div>
            ))}
            
            {houseDecorations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p>אסוף פריטים בכפר והוסף אותם לבית!</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Mobile Controls */}
      <div className="md:hidden grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
        <div />
        <Button size="lg" variant="outline" onClick={() => handleMobileMove("up")}>⬆️</Button>
        <div />
        <Button size="lg" variant="outline" onClick={() => handleMobileMove("left")}>⬅️</Button>
        <Button size="lg" variant="outline" onClick={() => handleMobileMove("down")}>⬇️</Button>
        <Button size="lg" variant="outline" onClick={() => handleMobileMove("right")}>➡️</Button>
      </div>

      {/* Collected Items */}
      {collectedItems.length > 0 && viewMode === "house" && (
        <Card className="p-4">
          <h3 className="font-bold mb-2">פריטים שנאספו (לחץ להוסיף לבית):</h3>
          <div className="flex flex-wrap gap-2">
            {collectedItems.map(item => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                onClick={() => addToHouse(item)}
                className="text-xl"
              >
                {item.emoji}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <p className="text-xs text-center text-muted-foreground">
        חצים או WASD לתנועה | אסוף פריטים והוסף אותם לבית
      </p>
    </div>
  );
};
