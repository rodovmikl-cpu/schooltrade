import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface SecretStock {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  rarity: "common" | "rare" | "legendary";
  owned: number;
}

interface NFT {
  id: string;
  name: string;
  rarity: "rare" | "epic" | "legendary";
  value: number;
  owned: boolean;
}

interface Achievement {
  id: string;
  title: string;
  emoji: string;
  condition: string;
  unlocked: boolean;
}

interface GameState {
  balance: number;
  stocks: SecretStock[];
  nfts: NFT[];
  influence: number;
  totalEarned: number;
  level: number;
  xp: number;
  xpToNext: number;
  achievements: Achievement[];
  tradesCount: number;
}

const STORAGE_KEY = "crypto-empire-state";

const INITIAL_STOCKS: Omit<SecretStock, "id" | "change" | "owned">[] = [
  { name: "צל דיגיטלי", symbol: "SHDW", price: 50, rarity: "common" },
  { name: "קוד שחור", symbol: "BLKC", price: 200, rarity: "common" },
  { name: "מטריקס VIP", symbol: "MVIP", price: 500, rarity: "common" },
  { name: "פאנטום נדיר", symbol: "PNTM", price: 1500, rarity: "rare" },
  { name: "דרקון הזהב", symbol: "GDRG", price: 5000, rarity: "rare" },
  { name: "אינפיניטי X", symbol: "INFX", price: 15000, rarity: "rare" },
  { name: "קוסמוס אלפא", symbol: "CSMA", price: 50000, rarity: "legendary" },
  { name: "אטלנטיס פריים", symbol: "ATLP", price: 200000, rarity: "legendary" },
  { name: "נובה אולטימט", symbol: "NVUL", price: 1000000, rarity: "legendary" },
];

const INITIAL_NFTS: Omit<NFT, "id" | "owned">[] = [
  { name: "חרב האש הנדירה", rarity: "rare", value: 5000 },
  { name: "מגן הדרקון", rarity: "rare", value: 8000 },
  { name: "כתר הקוסם", rarity: "epic", value: 25000 },
  { name: "ספר הסודות", rarity: "epic", value: 50000 },
  { name: "אבן הנצח", rarity: "legendary", value: 200000 },
  { name: "גביע האלים", rarity: "legendary", value: 500000 },
];

const INITIAL_ACHIEVEMENTS: Omit<Achievement, "unlocked">[] = [
  { id: "first_trade", title: "סוחר מתחיל", emoji: "📈", condition: "בצע עסקה ראשונה" },
  { id: "10_trades", title: "סוחר מנוסה", emoji: "💹", condition: "בצע 10 עסקאות" },
  { id: "first_nft", title: "אספן NFT", emoji: "🎨", condition: "רכוש NFT ראשון" },
  { id: "millionaire", title: "מיליונר", emoji: "💰", condition: "הגיע למיליון דולר" },
  { id: "legendary_stock", title: "משקיע אגדי", emoji: "⭐", condition: "קנה מניה אגדית" },
  { id: "all_nfts", title: "אספן שלם", emoji: "👑", condition: "רכוש את כל ה-NFT" },
  { id: "level5", title: "מאסטר שוק", emoji: "🏆", condition: "הגיע לרמה 5" },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const initGame = (): GameState => ({
  balance: 10000,
  stocks: INITIAL_STOCKS.map(s => ({ ...s, id: generateId(), change: (Math.random() - 0.4) * 30, owned: 0 })),
  nfts: INITIAL_NFTS.map(n => ({ ...n, id: generateId(), owned: false })),
  influence: 0,
  totalEarned: 0,
  level: 1,
  xp: 0,
  xpToNext: 500,
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
  tradesCount: 0,
});

export const CryptoEmpire = () => {
  const [game, setGame] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old saves
        if (!parsed.achievements) parsed.achievements = INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
        if (parsed.xp === undefined) { parsed.xp = 0; parsed.xpToNext = 500; }
        if (parsed.tradesCount === undefined) parsed.tradesCount = 0;
        return parsed;
      } catch { /* ignore */ }
    }
    return initGame();
  });
  const [tab, setTab] = useState<"stocks" | "nfts" | "events">("stocks");
  const [buyAmounts, setBuyAmounts] = useState<Record<string, string>>({});
  const [event, setEvent] = useState<string | null>(null);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }, [game]);

  // Check achievements
  const checkAchievements = useCallback((state: GameState): GameState => {
    const checks: Record<string, boolean> = {
      first_trade: state.tradesCount >= 1,
      "10_trades": state.tradesCount >= 10,
      first_nft: state.nfts.some(n => n.owned),
      millionaire: (state.balance + state.totalEarned) >= 1000000,
      legendary_stock: state.stocks.some(s => s.rarity === "legendary" && s.owned > 0),
      all_nfts: state.nfts.every(n => n.owned),
      level5: state.level >= 5,
    };

    let newState = { ...state };
    const updatedAchievements = state.achievements.map(a => {
      if (!a.unlocked && checks[a.id]) {
        setTimeout(() => {
          setShowAchievement(a);
          playPremiumSound("specialSuccess");
          setTimeout(() => setShowAchievement(null), 3000);
        }, 500);
        return { ...a, unlocked: true };
      }
      return a;
    });
    newState.achievements = updatedAchievements;
    return newState;
  }, []);

  // Price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGame(prev => {
        const eventChance = Math.random();
        let eventMsg: string | null = null;

        const updatedStocks = prev.stocks.map(s => {
          let bias = 0.03;
          let vol = s.rarity === "legendary" ? 0.4 : s.rarity === "rare" ? 0.3 : 0.2;
          if (eventChance < 0.03) { bias = 0.5; eventMsg = `🚀 שוק חם! מניות עולות בחדות!`; }
          else if (eventChance < 0.05) { bias = -0.3; eventMsg = `💥 קראש! ירידות בשוק הסודי!`; }
          else if (eventChance < 0.07) { eventMsg = `🔮 שמועה: מטבע נדיר עומד לזנק!`; }

          const change = (Math.random() - 0.5 + bias) * vol * 2;
          return { ...s, price: Math.max(1, s.price * (1 + change / 100 * 10)), change };
        });
        if (eventMsg) setEvent(eventMsg);
        return { ...prev, stocks: updatedStocks };
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (event) { const t = setTimeout(() => setEvent(null), 3000); return () => clearTimeout(t); }
  }, [event]);

  const addXP = (amount: number, state: GameState): GameState => {
    let xp = state.xp + amount;
    let level = state.level;
    let xpToNext = state.xpToNext;
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level++;
      xpToNext = Math.floor(xpToNext * 1.3);
      playPremiumSound("levelUp");
    }
    return { ...state, xp, level, xpToNext };
  };

  const buyStock = (stock: SecretStock, amount: number) => {
    const cost = stock.price * amount;
    if (cost > game.balance) return;
    playSound("click");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[0], 1);
    setGame(prev => {
      let next = {
        ...prev,
        balance: prev.balance - cost,
        stocks: prev.stocks.map(s => s.id === stock.id ? { ...s, owned: s.owned + amount } : s),
        influence: prev.influence + amount,
        tradesCount: prev.tradesCount + 1,
      };
      next = addXP(20 + amount * 5, next);
      return checkAchievements(next);
    });
    setBuyAmounts(p => ({ ...p, [stock.id]: "" }));
  };

  const sellStock = (stock: SecretStock) => {
    if (stock.owned <= 0) return;
    const revenue = stock.price * stock.owned;
    playPremiumSound("reward");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[1], Math.floor(revenue));
    setGame(prev => {
      let next = {
        ...prev,
        balance: prev.balance + revenue,
        stocks: prev.stocks.map(s => s.id === stock.id ? { ...s, owned: 0 } : s),
        totalEarned: prev.totalEarned + revenue,
        tradesCount: prev.tradesCount + 1,
      };
      next = addXP(30 + Math.floor(revenue / 1000), next);
      return checkAchievements(next);
    });
  };

  const buyNFT = (nft: NFT) => {
    if (nft.owned || nft.value > game.balance) return;
    playPremiumSound("specialSuccess");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[0], 1);
    setGame(prev => {
      let next = {
        ...prev,
        balance: prev.balance - nft.value,
        nfts: prev.nfts.map(n => n.id === nft.id ? { ...n, owned: true } : n),
        influence: prev.influence + 50,
        tradesCount: prev.tradesCount + 1,
      };
      next = addXP(100, next);
      return checkAchievements(next);
    });
  };

  const getDailyQuestIds = () => {
    const seed = new Date();
    const day = seed.getFullYear() * 10000 + (seed.getMonth() + 1) * 100 + seed.getDate();
    return [`cryptoEmpire-${day}-0`, `cryptoEmpire-${day}-1`, `cryptoEmpire-${day}-2`];
  };

  const rarityColor = (r: string) => r === "legendary" ? "text-yellow-400" : r === "epic" ? "text-purple-400" : r === "rare" ? "text-blue-400" : "text-muted-foreground";
  const rarityBg = (r: string) => r === "legendary" ? "border-yellow-500/40 bg-yellow-500/5" : r === "epic" ? "border-purple-500/40 bg-purple-500/5" : r === "rare" ? "border-blue-500/40 bg-blue-500/5" : "border-border";

  const totalPoints = Math.floor(game.totalEarned + game.balance + game.nfts.filter(n => n.owned).reduce((a, n) => a + n.value, 0));
  const unlockedCount = game.achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-yellow-400">💎 אימפריית הקריפטו: שוק סודי</h3>
        <p className="text-sm text-muted-foreground">רמה {game.level} | השפעה: {game.influence} | הישגים: {unlockedCount}/{game.achievements.length}</p>
      </div>

      {/* Achievement popup */}
      {showAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-yellow-500/50 rounded-2xl p-6 text-center animate-scale-in shadow-2xl">
            <div className="text-5xl mb-2">{showAchievement.emoji}</div>
            <p className="text-lg font-bold text-yellow-400">הישג חדש!</p>
            <p className="font-medium">{showAchievement.title}</p>
          </div>
        </div>
      )}

      {/* XP Bar */}
      <div className="px-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>רמה {game.level}</span>
          <span>{game.xp}/{game.xpToNext} XP</span>
        </div>
        <Progress value={(game.xp / game.xpToNext) * 100} className="h-2" />
      </div>

      {/* Daily Quests */}
      <DailyQuestPanel gameKey="cryptoEmpire" />

      {/* Balance */}
      <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
        <CardContent className="py-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">${totalPoints.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">מזומן: ${Math.floor(game.balance).toLocaleString()}</div>
        </CardContent>
      </Card>

      {event && (
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30 animate-scale-in font-bold">{event}</div>
      )}

      <div className="flex gap-2">
        {(["stocks", "nfts", "events"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="flex-1">
            {t === "stocks" ? "📈 מניות סודיות" : t === "nfts" ? "🎨 NFT נדירים" : "🏆 הישגים"}
          </Button>
        ))}
      </div>

      {tab === "stocks" && (
        <div className="space-y-2">
          {game.stocks.map(stock => (
            <div key={stock.id} className={`p-3 rounded-xl border-2 ${rarityBg(stock.rarity)} transition-all`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`font-bold ${rarityColor(stock.rarity)}`}>{stock.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">{stock.symbol}</span>
                  {stock.owned > 0 && <Badge variant="outline" className="mr-2 text-xs">×{stock.owned}</Badge>}
                </div>
                <div className="text-left">
                  <div className="font-bold">${stock.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div className={`text-xs ${stock.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Input type="number" placeholder="כמות" value={buyAmounts[stock.id] || ""} onChange={(e) => setBuyAmounts(p => ({ ...p, [stock.id]: e.target.value }))} className="w-24 h-8 text-sm" min="1" />
                <Button size="sm" onClick={() => buyStock(stock, parseInt(buyAmounts[stock.id]) || 1)} disabled={(stock.price * (parseInt(buyAmounts[stock.id]) || 1)) > game.balance}>קנה</Button>
                {stock.owned > 0 && <Button size="sm" variant="destructive" onClick={() => sellStock(stock)}>מכור הכל</Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "nfts" && (
        <div className="grid gap-3">
          {game.nfts.map(nft => (
            <div key={nft.id} className={`p-4 rounded-xl border-2 ${rarityBg(nft.rarity)} ${nft.owned ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`font-bold ${rarityColor(nft.rarity)}`}>{nft.name}</span>
                  <Badge variant="outline" className={`mr-2 text-xs ${rarityColor(nft.rarity)}`}>
                    {nft.rarity === "legendary" ? "אגדי" : nft.rarity === "epic" ? "אפי" : "נדיר"}
                  </Badge>
                </div>
                <div className="text-left">
                  <div className="font-bold">${nft.value.toLocaleString()}</div>
                  {nft.owned ? <span className="text-xs text-green-400">✓ בבעלותך</span> : <Button size="sm" onClick={() => buyNFT(nft)} disabled={nft.value > game.balance}>רכוש</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-3">
          <p className="text-lg font-bold text-center">🏆 הישגים</p>
          {game.achievements.map(a => (
            <div key={a.id} className={`p-3 rounded-lg border flex justify-between items-center ${a.unlocked ? "border-yellow-500/30 bg-yellow-500/5" : "border-border opacity-60"}`}>
              <span>{a.emoji} {a.title}</span>
              <span className="text-xs text-muted-foreground">{a.unlocked ? "✅" : a.condition}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
