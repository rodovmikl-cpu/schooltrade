import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import skin67Image from "@/assets/skin-67.png";

interface Skin {
  id: string;
  name: string;
  rarity: "נפוץ" | "נדיר" | "אקסקלוסיבי" | "אגדי" | "מיתי" | "סופר אגדי";
  emoji: string;
  obtained: boolean;
  isSpecial?: boolean;
  image?: string;
}

const RARITY_COLORS: Record<Skin["rarity"], string> = {
  "נפוץ": "bg-gray-600",
  "נדיר": "bg-blue-600",
  "אקסקלוסיבי": "bg-purple-600",
  "אגדי": "bg-yellow-600",
  "מיתי": "bg-pink-600",
  "סופר אגדי": "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500",
};

const RARITY_BORDERS: Record<Skin["rarity"], string> = {
  "נפוץ": "border-gray-400",
  "נדיר": "border-blue-400",
  "אקסקלוסיבי": "border-purple-400",
  "אגדי": "border-yellow-400",
  "מיתי": "border-pink-400",
  "סופר אגדי": "border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)]",
};

const ALL_SKINS_EMOJIS = [
  // Christmas themed (1-50)
  "🎄", "🎅", "🦌", "⛄", "🎁", "🔔", "❄️", "🌟", "🎀", "🍪",
  "🥛", "🕯️", "🧣", "🧤", "🎿", "⛸️", "🛷", "🎠", "🎪", "🎭",
  "🦃", "🍗", "🥧", "🍰", "🎂", "🧁", "🍫", "🍬", "🍭", "🧇",
  "🎺", "🎷", "🎸", "🎻", "🪕", "🥁", "🪘", "🎹", "🪗", "🎵",
  "🎶", "🎼", "🎤", "🎧", "🎙️", "📻", "📺", "📷", "📸", "🎥",
  // Winter themed (51-100)
  "☃️", "🌨️", "🏔️", "🏠", "🏡", "🛖", "⛪", "🕍", "🎆", "🎇",
  "✨", "🎊", "🎉", "🪅", "🎋", "🎍", "🎎", "🎏", "🪭", "🧧",
  "🍾", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍵", "☕", "🫖",
  "🥤", "🧃", "🧊", "🍶", "🍺", "🍻", "🥤", "🧋", "🫗", "🍼",
  "🥣", "🥗", "🍲", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤",
  // Weather & Elements (101-150)
  "🥶", "🌬️", "💨", "🌀", "🌊", "💎", "💍", "👑", "🎩", "🧥",
  "🧦", "👟", "👢", "👞", "🥾", "🎒", "👜", "👛", "🧳", "🌲",
  "🌳", "🌴", "🪵", "🪨", "🪴", "🌱", "🌿", "☘️", "🍀", "🌺",
  "🌸", "🌷", "🌹", "🥀", "🌻", "🌼", "💐", "🪻", "🪷", "🍁",
  "🍂", "🍃", "🌾", "🌵", "🎋", "🎍", "🍄", "🌰", "🦀", "🦞",
  // Animals (151-200)
  "🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐵",
  "🦄", "🐴", "🦋", "🐛", "🐝", "🐞", "🦗", "🪲", "🐌", "🦟",
  "🐢", "🐍", "🦎", "🐊", "🐉", "🦕", "🦖", "🐙", "🦑", "🦐",
  "🐡", "🐠", "🐟", "🐬", "🐳", "🦈", "🐋", "🐚", "🦭", "🦦",
  "🦫", "🐿️", "🦔", "🦡", "🐾", "🐓", "🦆", "🦢", "🦩", "🦅",
  // Birds & Sky (201-250)
  "🦉", "🦜", "🕊️", "🦚", "🦤", "🪶", "🐦", "🦨", "🦔", "🐇",
  "🌙", "⭐", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔",
  "🌞", "🌝", "🌛", "🌜", "☀️", "⛅", "🌤️", "🌥️", "🌦️", "🌧️",
  "🪐", "🌌", "💫", "🔮", "🧿", "🎱", "🎯", "🎲", "🃏", "🀄",
  "🧩", "🎨", "🖼️", "🎭", "🎪", "🎢", "🎡", "🎠", "🏰", "🏯",
  // Objects & Symbols (251-300)
  "🗼", "🗽", "⛲", "🏛️", "🕌", "🛕", "⛩️", "🕋", "🗿", "🪬",
  "🔱", "⚜️", "🏵️", "🎖️", "🏅", "🥇", "🥈", "🥉", "🏆", "🎗️",
  "🧸", "🪆", "🎎", "🎏", "🎐", "🪩", "🪄", "🎀", "🎃", "🪔",
  "📿", "💎", "💍", "👑", "⚔️", "🛡️", "🗡️", "🔑", "🗝️", "🪙",
  "💰", "💵", "💴", "💶", "💷", "💳", "🧭", "⏳", "⌛", "🔮",
  // Fantasy & Magic (301-350)
  "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "👻", "💀", "☠️",
  "👽", "👾", "🤖", "🎃", "😈", "👿", "👹", "👺", "🤡", "💩",
  "🔥", "💧", "🌈", "⚡", "💥", "💫", "✨", "🌪️", "🌊", "❄️",
  "🧊", "💨", "☁️", "⛈️", "🌩️", "🌪️", "🌫️", "🌁", "🌃", "🌉",
  "🌆", "🌇", "🌅", "🌄", "🏞️", "🎑", "🎆", "🎇", "🧨", "🎉",
  // Food & Sweets (351-400)
  "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫",
  "🍬", "🍭", "🍮", "🍯", "🍳", "🥚", "🧈", "🥞", "🧇", "🥓",
  "🥩", "🍖", "🍗", "🥪", "🌭", "🍔", "🍟", "🍕", "🫓", "🥙",
  "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🍲", "🍜", "🍝",
  "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡",
  // Sports & Games (401-450)
  "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
  "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
  "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷",
  "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "⛹️", "🤾", "🏌️",
  "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆",
  // Tech & Science (451-500)
  "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀",
  "🧮", "🎮", "🕹️", "🎰", "📱", "📲", "☎️", "📞", "📟", "📠",
  "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️", "💸", "💵", "💴",
  "💶", "💷", "💰", "💳", "🧪", "🔬", "🔭", "📡", "🛰️", "🚀",
  "✈️", "🚁", "🛸", "🛩️", "🚂", "🚃", "🚄", "🚅", "🚆", "🎯",
];

const RARITIES: Skin["rarity"][] = ["נפוץ", "נדיר", "אקסקלוסיבי", "אגדי", "מיתי", "סופר אגדי"];

// Generate all 500 skins with different rarities
const generateAllSkins = (): Omit<Skin, "obtained">[] => {
  const skins: Omit<Skin, "obtained">[] = [];
  
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  
  // Add the special "67" skin as the first one
  skins.push({
    id: "skin-67-special",
    name: "67",
    rarity: "סופר אגדי",
    emoji: "🔷",
    isSpecial: true,
    image: skin67Image,
  });
  
  for (let i = 1; i < 500; i++) {
    // Rarity distribution: 35% common, 25% rare, 20% exclusive, 12% legendary, 7% mythic, 1% super legendary
    let rarity: Skin["rarity"];
    const rand = seededRandom(i + 1) * 100;
    if (rand < 35) rarity = "נפוץ";
    else if (rand < 60) rarity = "נדיר";
    else if (rand < 80) rarity = "אקסקלוסיבי";
    else if (rand < 92) rarity = "אגדי";
    else if (rand < 99) rarity = "מיתי";
    else rarity = "סופר אגדי";

    skins.push({
      id: `all-skin-${i}`,
      name: `סקין #${i + 1}`,
      rarity,
      emoji: ALL_SKINS_EMOJIS[i % ALL_SKINS_EMOJIS.length],
    });
  }
  
  return skins;
};

const ALL_AVAILABLE_SKINS = generateAllSkins();

export const SkinsCollection = () => {
  const [obtainedSkinIds, setObtainedSkinIds] = useState<Set<string>>(new Set());
  const [selectedRarity, setSelectedRarity] = useState<Skin["rarity"] | "all" | "מחלקת האגדות">("all");

  useEffect(() => {
    const saved = localStorage.getItem("christmas-calendar-2024");
    if (saved) {
      const data = JSON.parse(saved);
      const ids = new Set<string>();
      
      if (data.collectedSkins && data.collectedSkins.length > 0) {
        // Map collected skins to the collection - skip slot 0 which is reserved for "67"
        const obtainedCount = data.collectedSkins.length;
        for (let i = 1; i <= Math.min(obtainedCount, 499); i++) {
          ids.add(`all-skin-${i}`);
        }
      }
      
      // The "67" skin (skin-67-special) is ONLY obtained through calendar
      // It must be explicitly marked as has67Skin = true
      // Currently: 0 players own this skin
      if (data.has67Skin === true) {
        ids.add("skin-67-special");
      }
      // Note: has67Skin defaults to false/undefined, so no one has it yet
      
      setObtainedSkinIds(ids);
    }
  }, []);

  const getFilteredSkins = () => {
    if (selectedRarity === "all") return ALL_AVAILABLE_SKINS;
    if (selectedRarity === "מחלקת האגדות") {
      return ALL_AVAILABLE_SKINS.filter(s => s.rarity === "סופר אגדי");
    }
    return ALL_AVAILABLE_SKINS.filter(s => s.rarity === selectedRarity);
  };

  const filteredSkins = getFilteredSkins();
  const obtainedCount = obtainedSkinIds.size;
  const totalCount = 500;

  const countByRarity = (rarity: Skin["rarity"]) => {
    const total = ALL_AVAILABLE_SKINS.filter(s => s.rarity === rarity).length;
    const obtained = ALL_AVAILABLE_SKINS.filter(s => s.rarity === rarity && obtainedSkinIds.has(s.id)).length;
    return { total, obtained };
  };

  const legendsCount = countByRarity("סופר אגדי");

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-green-500">🎨 אוסף סקינים 🎨</h2>
        <p className="text-muted-foreground">אספת {obtainedCount} מתוך {totalCount} סקינים</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-500"
          style={{ width: `${(obtainedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Rarity filters */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge 
          className={`cursor-pointer ${selectedRarity === "all" ? "bg-primary" : "bg-gray-600"}`}
          onClick={() => setSelectedRarity("all")}
        >
          הכל ({obtainedCount}/{totalCount})
        </Badge>
        {RARITIES.filter(r => r !== "סופר אגדי").map(rarity => {
          const { total, obtained } = countByRarity(rarity);
          return (
            <Badge 
              key={rarity}
              className={`cursor-pointer ${selectedRarity === rarity ? RARITY_COLORS[rarity] : "bg-gray-600"}`}
              onClick={() => setSelectedRarity(rarity)}
            >
              {rarity} ({obtained}/{total})
            </Badge>
          );
        })}
        {/* Special Department of Legends filter */}
        <Badge 
          className={`cursor-pointer ${
            selectedRarity === "מחלקת האגדות" 
              ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse" 
              : "bg-gray-600"
          }`}
          onClick={() => setSelectedRarity("מחלקת האגדות")}
        >
          ⭐ מחלקת האגדות ({legendsCount.obtained}/{legendsCount.total})
        </Badge>
      </div>

      {/* Skins grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {filteredSkins.map((skin) => {
          const isObtained = obtainedSkinIds.has(skin.id);
          const isSpecial67 = skin.id === "skin-67-special";
          
          return (
            <Card
              key={skin.id}
              className={`
                aspect-square flex items-center justify-center transition-all duration-300 relative overflow-hidden
                border-2 ${isObtained ? RARITY_BORDERS[skin.rarity] : "border-gray-700"}
                ${isObtained 
                  ? "bg-card hover:scale-110" 
                  : "bg-gray-900 cursor-not-allowed"
                }
                ${isSpecial67 && isObtained ? "animate-pulse" : ""}
              `}
              title={isObtained ? `${skin.name} - ${skin.rarity}` : "???"}
            >
              {isObtained ? (
                isSpecial67 && skin.image ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={skin.image} 
                      alt="67" 
                      className="w-full h-full object-contain p-1"
                    />
                    {/* Christmas scarf effect */}
                    <div className="absolute bottom-1/3 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-white to-red-500 opacity-80 animate-pulse" />
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-purple-500/20 animate-pulse" />
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl">{skin.emoji}</span>
                )
              ) : (
                <span className="text-2xl md:text-3xl text-gray-700">❓</span>
              )}
              {isSpecial67 && !isObtained && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/50 to-purple-900/50" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          {RARITIES.filter(r => r !== "סופר אגדי").map(rarity => (
            <div key={rarity} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${RARITY_COLORS[rarity]}`} />
              <span>{rarity}</span>
            </div>
          ))}
        </div>
        
        {/* Special Department of Legends section */}
        <div className="border-t border-gray-700 pt-4">
          <div className="text-center mb-2">
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              ⭐ מחלקת האגדות ⭐
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
            <span className="text-sm text-cyan-400">סופר אגדי</span>
            <span className="text-xs text-muted-foreground">(הסקין הנדיר ביותר!)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
