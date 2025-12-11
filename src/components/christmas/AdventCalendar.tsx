import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChristmas } from "@/contexts/ChristmasContext";
import { useToast } from "@/hooks/use-toast";

interface SkinReward {
  id: string;
  name: string;
  rarity: "נפוץ" | "נדיר" | "אקסקלוסיבי" | "אגדי" | "מיתי" | "סופר אגדי";
  emoji: string;
}

const RARITY_COLORS: Record<SkinReward["rarity"], string> = {
  "נפוץ": "from-gray-400 to-gray-600",
  "נדיר": "from-blue-400 to-blue-600",
  "אקסקלוסיבי": "from-purple-400 to-purple-600",
  "אגדי": "from-yellow-400 to-orange-600",
  "מיתי": "from-pink-400 to-red-600",
  "סופר אגדי": "from-cyan-400 via-blue-400 to-purple-400",
};

const RARITY_TEXT_COLORS: Record<SkinReward["rarity"], string> = {
  "נפוץ": "text-gray-300",
  "נדיר": "text-blue-300",
  "אקסקלוסיבי": "text-purple-300",
  "אגדי": "text-yellow-300",
  "מיתי": "text-pink-300",
  "סופר אגדי": "text-cyan-300",
};

const SKIN_EMOJIS = [
  "🎄", "🎅", "🦌", "⛄", "🎁", "🔔", "❄️", "🌟", "🎀", "🍪",
  "🥛", "🕯️", "🧣", "🧤", "🎿", "⛸️", "🛷", "🎠", "🎪", "🎭",
  "🦃", "🍗", "🥧", "🍰", "🎂", "🧁", "🍫", "🍬", "🍭", "🧇",
  "☃️", "🌨️", "🏔️", "🏠", "🏡", "🛖", "⛪", "🕍", "🎆", "🎇",
  "✨", "🎊", "🎉", "🪅", "🎋", "🎍", "🎎", "🎏", "🪭", "🧧",
  "🍾", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍵", "☕", "🫖",
  "🧊", "🥶", "🌬️", "💨", "🌀", "🌊", "💎", "💍", "👑", "🎩",
  "🧥", "🧦", "👟", "👢", "👞", "🥾", "🎒", "👜", "👛", "🧳",
  "🌲", "🌳", "🌴", "🪵", "🪨", "🪴", "🌱", "🌿", "☘️", "🍀",
  "🦅", "🦉", "🦜", "🕊️", "🦚", "🦤", "🪶", "🐦", "🦨", "🦔",
  "🌙", "⭐", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔",
  "🪐", "🌌", "💫", "🔮", "🧿", "🎱", "🎯", "🎲", "🃏", "🀄",
];

const generateSkin = (day: number): SkinReward => {
  const rarityChance = Math.random() * 100;
  const dayBonus = day * 2;
  
  let rarity: SkinReward["rarity"];
  
  // Super Legendary "67" - EXTREMELY RARE
  // Only possible on days 20-25, with a 0.01% base chance (1 in 10,000)
  // Even on Dec 25, only 0.05% chance (1 in 2,000)
  const superLegendaryChance = Math.random() * 10000;
  const is67Eligible = day >= 20 && day <= 25;
  const superThreshold = day === 25 ? 9999.5 : 9999.9; // 0.05% on Dec 25, 0.01% on days 20-24
  
  if (is67Eligible && superLegendaryChance > superThreshold) {
    rarity = "סופר אגדי";
  } else if (rarityChance + dayBonus > 98) {
    rarity = "מיתי";
  } else if (rarityChance + dayBonus > 90) {
    rarity = "אגדי";
  } else if (rarityChance + dayBonus > 75) {
    rarity = "אקסקלוסיבי";
  } else if (rarityChance + dayBonus > 50) {
    rarity = "נדיר";
  } else {
    rarity = "נפוץ";
  }

  // Day 1 is always common
  if (day === 1) {
    rarity = "נפוץ";
  }

  const emoji = SKIN_EMOJIS[Math.floor(Math.random() * SKIN_EMOJIS.length)];
  
  return {
    id: `skin-${day}-${Date.now()}-${Math.random()}`,
    name: rarity === "סופר אגדי" ? "67 ⭐" : `סקין יום ${day}`,
    rarity,
    emoji: rarity === "סופר אגדי" ? "🔷" : emoji,
  };
};

export const AdventCalendar = () => {
  const { currentDay, isChristmasActive } = useChristmas();
  const { toast } = useToast();
  const [openedDays, setOpenedDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState<SkinReward | null>(null);
  const [collectedSkins, setCollectedSkins] = useState<SkinReward[]>([]);
  const [has67Skin, setHas67Skin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("christmas-calendar-2024");
    if (saved) {
      const data = JSON.parse(saved);
      setOpenedDays(data.openedDays || []);
      setCollectedSkins(data.collectedSkins || []);
      setHas67Skin(data.has67Skin || false);
    }
  }, []);

  const saveData = (newOpenedDays: number[], newSkins: SkinReward[], got67: boolean) => {
    localStorage.setItem("christmas-calendar-2024", JSON.stringify({
      openedDays: newOpenedDays,
      collectedSkins: newSkins,
      has67Skin: got67,
    }));
  };

  const handleDayClick = (day: number) => {
    if (!isChristmasActive) return;
    
    if (day > currentDay) {
      toast({
        title: "🔒 היום הזה עדיין נעול",
        description: `תוכל לפתוח אותו ב-${day} בדצמבר`,
        variant: "destructive",
      });
      return;
    }

    if (openedDays.includes(day)) {
      toast({
        title: "📦 כבר פתחת את היום הזה",
        description: "המתן ליום הבא!",
      });
      return;
    }

    setSelectedDay(day);
    
    const newSkins: SkinReward[] = [];
    let gotSuper = false;
    
    for (let i = 0; i < 10; i++) {
      const skin = generateSkin(day);
      newSkins.push(skin);
      if (skin.rarity === "סופר אגדי") {
        gotSuper = true;
      }
    }

    const rarityOrder: SkinReward["rarity"][] = ["נפוץ", "נדיר", "אקסקלוסיבי", "אגדי", "מיתי", "סופר אגדי"];
    const bestSkin = newSkins.sort((a, b) => {
      return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
    })[0];

    setCurrentReward(bestSkin);
    setShowReward(true);

    const newOpenedDays = [...openedDays, day];
    const allNewSkins = [...collectedSkins, ...newSkins];
    const newHas67 = has67Skin || gotSuper;
    
    setOpenedDays(newOpenedDays);
    setCollectedSkins(allNewSkins);
    setHas67Skin(newHas67);
    saveData(newOpenedDays, allNewSkins, newHas67);
    
    if (gotSuper) {
      toast({
        title: "🌟 WOW! קיבלת את הסקין הנדיר ביותר! 🌟",
        description: "67 - סופר אגדי מתוך מחלקת האגדות!",
      });
    }
  };

  const days = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-red-500">🎄 לוח חג המולד 🎄</h2>
        <p className="text-muted-foreground">פתח יום אחד בכל יום וקבל 10 סקינים!</p>
        {has67Skin && (
          <p className="text-cyan-400 text-sm mt-1 animate-pulse">⭐ יש לך את 67 - הסקין הנדיר ביותר! ⭐</p>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3 md:gap-4">
        {days.map((day) => {
          const isOpened = openedDays.includes(day);
          const isToday = day === currentDay;
          const isFuture = day > currentDay;

          return (
            <Card
              key={day}
              className={`
                aspect-square flex items-center justify-center cursor-pointer transition-all duration-300
                ${isOpened 
                  ? "bg-green-900/50 border-green-500" 
                  : isToday 
                    ? "bg-red-600/50 border-yellow-400 border-2 animate-pulse hover:scale-105" 
                    : isFuture 
                      ? "bg-gray-800/50 opacity-50 cursor-not-allowed" 
                      : "bg-red-900/50 border-red-500 hover:scale-105 hover:bg-red-800/50"
                }
              `}
              onClick={() => handleDayClick(day)}
            >
              <div className="text-center">
                {isOpened ? (
                  <span className="text-3xl">✅</span>
                ) : (
                  <>
                    <div className="text-2xl md:text-3xl font-bold">{day}</div>
                    {isToday && <div className="text-xs text-yellow-300">פתוח!</div>}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>ימים שנפתחו: {openedDays.length}/25</p>
        <p>סקינים שנאספו: {collectedSkins.length}</p>
      </div>

      <Dialog open={showReward} onOpenChange={setShowReward}>
        <DialogContent className="text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎁 מזל טוב! 🎁</DialogTitle>
          </DialogHeader>
          
          {currentReward && (
            <div className="space-y-4 py-6">
              <div className={`text-6xl ${currentReward.rarity === "סופר אגדי" ? "animate-bounce" : "animate-bounce"}`}>
                {currentReward.emoji}
              </div>
              <div className={`text-xl font-bold bg-gradient-to-r ${RARITY_COLORS[currentReward.rarity]} bg-clip-text text-transparent`}>
                {currentReward.name}
              </div>
              <div className={`text-lg font-semibold ${RARITY_TEXT_COLORS[currentReward.rarity]}`}>
                {currentReward.rarity}
                {currentReward.rarity === "סופר אגדי" && (
                  <span className="block text-xs mt-1">מחלקת האגדות</span>
                )}
              </div>
              <p className="text-muted-foreground">
                קיבלת 10 סקינים ליום {selectedDay}!
              </p>
              <Button onClick={() => setShowReward(false)} className="bg-green-600 hover:bg-green-700">
                אחלה! 🎄
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
