import { isPremiumUser } from "@/lib/premium";

interface PremiumGameBadgeProps {
  userCode: string;
}

export const PremiumGameBadge = ({ userCode }: PremiumGameBadgeProps) => {
  if (!isPremiumUser(userCode)) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-[#00C853]/40 bg-gradient-to-r from-[#00C853]/10 via-[#00C853]/5 to-[#00C853]/10 p-3 mb-4">
      <div className="absolute inset-0 premium-sparkle-bg pointer-events-none" />
      <div className="flex items-center justify-center gap-2 relative z-10">
        <span className="text-lg">👑</span>
        <span className="font-bold text-[#00C853] text-sm premium-text-glow">
          חבר מועדון — ×2 תגמול
        </span>
        <span className="text-lg">✨</span>
      </div>
    </div>
  );
};
