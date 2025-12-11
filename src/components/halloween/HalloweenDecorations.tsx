export const HalloweenDecorations = () => {
  return (
    <div className="halloween-decorations pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Floating Ghosts */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`ghost-${i}`}
          className="absolute text-6xl opacity-30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 2}s`,
            animationDuration: `${8 + i * 2}s`,
          }}
        >
          👻
        </div>
      ))}

      {/* Flying Bats */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`bat-${i}`}
          className="absolute text-4xl opacity-40 animate-fly-across"
          style={{
            top: `${Math.random() * 80}%`,
            animationDelay: `${i * 3}s`,
            animationDuration: `${12 + i}s`,
          }}
        >
          🦇
        </div>
      ))}

      {/* Pumpkins */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`pumpkin-${i}`}
          className="absolute text-5xl opacity-50 animate-pulse"
          style={{
            left: `${10 + i * 15}%`,
            bottom: `${Math.random() * 20}%`,
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${3 + i}s`,
          }}
        >
          🎃
        </div>
      ))}

      {/* Fog Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent animate-fog" />
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/10 via-transparent to-transparent animate-fog-reverse" />

      {/* Cobwebs */}
      <div className="absolute top-0 left-0 text-6xl opacity-20">🕸️</div>
      <div className="absolute top-0 right-0 text-6xl opacity-20 scale-x-[-1]">🕸️</div>
      <div className="absolute bottom-0 left-0 text-6xl opacity-20 rotate-180">🕸️</div>
      <div className="absolute bottom-0 right-0 text-6xl opacity-20 scale-x-[-1] rotate-180">🕸️</div>
    </div>
  );
};
