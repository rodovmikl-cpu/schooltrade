import { useHalloween } from '@/contexts/HalloweenContext';

export const HalloweenCountdown = () => {
  const { timeUntilHalloween } = useHalloween();

  if (!timeUntilHalloween) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] shadow-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">🎃</span>
            <span className="text-xs sm:text-sm md:text-base font-bold" style={{ color: '#FFA500', fontFamily: 'Arial, sans-serif' }}>
              אירוע ה-Halloween יתחיל בעוד:
            </span>
          </div>
          <div className="flex gap-1 sm:gap-2 text-center" dir="ltr">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-xl md:text-2xl font-bold" style={{ color: '#FFA500' }}>
                {timeUntilHalloween.days}
              </span>
              <span className="text-[10px] sm:text-xs" style={{ color: '#FFA500' }}>ימים</span>
            </div>
            <span className="text-base sm:text-xl" style={{ color: '#FFA500' }}>:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-xl md:text-2xl font-bold" style={{ color: '#FFA500' }}>
                {timeUntilHalloween.hours}
              </span>
              <span className="text-[10px] sm:text-xs" style={{ color: '#FFA500' }}>שעות</span>
            </div>
            <span className="text-base sm:text-xl" style={{ color: '#FFA500' }}>:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-xl md:text-2xl font-bold" style={{ color: '#FFA500' }}>
                {timeUntilHalloween.minutes}
              </span>
              <span className="text-[10px] sm:text-xs" style={{ color: '#FFA500' }}>דקות</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
