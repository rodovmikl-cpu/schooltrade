import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface Decoration {
  id: number;
  type: "ornament" | "star" | "candy" | "gift" | "tree";
  left: number;
  top: number;
  size: number;
  color: string;
}

export const ChristmasDecorations = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [decorations, setDecorations] = useState<Decoration[]>([]);

  useEffect(() => {
    // Generate snowflakes
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 50; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 8 + 4,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.6 + 0.4,
      });
    }
    setSnowflakes(flakes);

    // Generate decorations
    const colors = ["#ff0000", "#ffd700", "#00ff00", "#ff69b4", "#87ceeb"];
    const types: Decoration["type"][] = ["ornament", "star", "candy", "gift", "tree"];
    const decs: Decoration[] = [];
    
    for (let i = 0; i < 15; i++) {
      decs.push({
        id: i,
        type: types[Math.floor(Math.random() * types.length)],
        left: Math.random() * 90 + 5,
        top: Math.random() * 80 + 10,
        size: Math.random() * 20 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setDecorations(decs);
  }, []);

  const renderDecoration = (dec: Decoration) => {
    switch (dec.type) {
      case "ornament":
        return "🎄";
      case "star":
        return "⭐";
      case "candy":
        return "🍬";
      case "gift":
        return "🎁";
      case "tree":
        return "🌲";
      default:
        return "❄️";
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-30">
      {/* Snowflakes */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute animate-snowfall"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            opacity: flake.opacity,
          }}
        >
          ❄️
        </div>
      ))}

      {/* Decorations */}
      {decorations.map((dec) => (
        <div
          key={dec.id}
          className="absolute animate-float-slow"
          style={{
            left: `${dec.left}%`,
            top: `${dec.top}%`,
            fontSize: `${dec.size}px`,
            opacity: 0.7,
          }}
        >
          {renderDecoration(dec)}
        </div>
      ))}

      {/* Top garland */}
      <div className="absolute top-0 left-0 right-0 flex justify-around p-2 text-2xl">
        {["🎄", "⭐", "🎁", "🔔", "🎄", "⭐", "🎁", "🔔", "🎄"].map((emoji, i) => (
          <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
            {emoji}
          </span>
        ))}
      </div>

      {/* Corner decorations */}
      <div className="absolute bottom-4 left-4 text-6xl animate-bounce" style={{ animationDuration: "3s" }}>
        🎅
      </div>
      <div className="absolute bottom-4 right-4 text-6xl animate-bounce" style={{ animationDuration: "3s", animationDelay: "1.5s" }}>
        🦌
      </div>
    </div>
  );
};
