import { useChristmas } from "@/contexts/ChristmasContext";

export const ChristmasCountdown = () => {
  const { daysUntilChristmas, isChristmasActive } = useChristmas();

  if (!isChristmasActive || daysUntilChristmas <= 0) return null;

  return (
    <div 
      className="fixed top-16 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white py-2 px-4 text-center shadow-lg"
      dir="rtl"
    >
      <div className="container mx-auto flex items-center justify-center gap-4">
        <span className="text-2xl">🎄</span>
        <span className="text-lg font-bold">
          ימים עד חג המולד: <span className="text-yellow-300 text-xl">{daysUntilChristmas}</span>
        </span>
        <span className="text-2xl">🎅</span>
      </div>
    </div>
  );
};
