import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  prevPrice: number;
  owned: number;
  avgBuyPrice: number;
  rarity: "common" | "rare" | "legendary";
}

interface NFT {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  value: number;
  owned: boolean;
  multiplier: number;
}

interface Achievement {
  id: string; title: string; emoji: string; condition: string; unlocked: boolean;
}

interface GameState {
  balance: number;
  cryptos: Crypto[];
  nfts: NFT[];
  totalEarned: number;
  level: number;
  xp: number;
  xpToNext: number;
  achievements: Achievement[];
  tradesCount: number;
  influence: number;
}

const STORAGE_KEY = "crypto-empire-v2";

const INITIAL_CRYPTOS: Omit<Crypto, "id" | "prevPrice" | "owned" | "avgBuyPrice">[] = [
  { name: "צל דיגיטלי", symbol: "SHDW", price: 45, rarity: "common" },
  { name: "קוד שחור", symbol: "BLKC", price: 120, rarity: "common" },
  { name: "מטריקס VIP", symbol: "MVIP", price: 310, rarity: "common" },
  { name: "ביט נסתר", symbol: "HBIT", price: 78, rarity: "common" },
  { name: "דרקון אש", symbol: "FDRG", price: 520, rarity: "common" },
  { name: "נובה קוין", symbol: "NOVA", price: 195, rarity: "common" },
  { name: "פאנטום X", symbol: "PNTX", price: 890, rarity: "rare" },
  { name: "אינפיניטי", symbol: "INFN", price: 1400, rarity: "rare" },
  { name: "קוסמוס אלפא", symbol: "CSMA", price: 2800, rarity: "rare" },
  { name: "סטארלייט", symbol: "STRL", price: 650, rarity: "rare" },
  { name: "זירו דיי", symbol: "ZDAY", price: 3500, rarity: "rare" },
  { name: "דארק מאטר", symbol: "DKMT", price: 5200, rarity: "rare" },
  { name: "אטלנטיס", symbol: "ATLS", price: 12000, rarity: "legendary" },
  { name: "נובה אולטימט", symbol: "NVUL", price: 28000, rarity: "legendary" },
  { name: "קוואנטום", symbol: "QNTM", price: 45000, rarity: "legendary" },
  { name: "אומגה פריים", symbol: "OMGP", price: 78000, rarity: "legendary" },
  { name: "היפר ספייס", symbol: "HYPS", price: 150000, rarity: "legendary" },
  { name: "אטרנל", symbol: "ETRN", price: 350000, rarity: "legendary" },
  { name: "גנסיס", symbol: "GNSS", price: 800000, rarity: "legendary" },
  { name: "שדה הכוח", symbol: "FRCE", price: 2000000, rarity: "legendary" },
];

const INITIAL_NFTS: Omit<NFT, "id" | "owned">[] = [
  // Common/Rare: ×1.1 - ×1.5
  { name: "חרב ברונזה", rarity: "common", value: 1000, multiplier: 1.1 },
  { name: "מגן עץ", rarity: "common", value: 2000, multiplier: 1.15 },
  { name: "טבעת הברזל", rarity: "rare", value: 4000, multiplier: 1.3 },
  { name: "קסדת השומר", rarity: "rare", value: 6000, multiplier: 1.4 },
  { name: "חרב האש", rarity: "rare", value: 7500, multiplier: 1.5 },
  // 8k-50k: ×1.6 - ×2.3
  { name: "כתר הקוסם", rarity: "epic", value: 10000, multiplier: 1.6 },
  { name: "ספר הסודות", rarity: "epic", value: 18000, multiplier: 1.8 },
  { name: "שריון הדרקון", rarity: "epic", value: 30000, multiplier: 2.0 },
  { name: "מפתח הנצח", rarity: "epic", value: 45000, multiplier: 2.3 },
  // Highest tier: up to ×20
  { name: "אבן הנצח", rarity: "legendary", value: 100000, multiplier: 3.0 },
  { name: "גביע האלים", rarity: "legendary", value: 300000, multiplier: 5.0 },
  { name: "כוכב הבריאה", rarity: "mythic", value: 800000, multiplier: 10.0 },
  { name: "אינפיניטי סטון", rarity: "mythic", value: 2000000, multiplier: 20.0 },
];

const INITIAL_ACHIEVEMENTS: Omit<Achievement, "unlocked">[] = [
  { id: "first_trade", title: "סוחר מתחיל", emoji: "📈", condition: "בצע עסקה" },
  { id: "10_trades", title: "סוחר מנוסה", emoji: "💹", condition: "10 עסקאות" },
  { id: "first_nft", title: "אספן NFT", emoji: "🎨", condition: "רכוש NFT" },
  { id: "profit_10k", title: "רווח ראשון", emoji: "💰", condition: "הרוויח 10K" },
  { id: "millionaire", title: "מיליונר", emoji: "🤑", condition: "מיליון דולר" },
  { id: "legendary_stock", title: "משקיע אגדי", emoji: "⭐", condition: "קנה מניה אגדית" },
  { id: "all_nfts", title: "אספן שלם", emoji: "👑", condition: "כל ה-NFT" },
  { id: "level5", title: "מאסטר שוק", emoji: "🏆", condition: "רמה 5" },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const initGame = (): GameState => ({
  balance: 10000,
  cryptos: INITIAL_CRYPTOS.map(c => ({ ...c, id: generateId(), prevPrice: c.price, owned: 0, avgBuyPrice: 0 })),
  nfts: INITIAL_NFTS.map(n => ({ ...n, id: generateId(), owned: false })),
  totalEarned: 0, level: 1, xp: 0, xpToNext: 500,
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
  tradesCount: 0, influence: 0,
});

export const CryptoEmpire = () => {
  const [game, setGame] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (!p.cryptos || p.cryptos.length < 15) return initGame(); // Migration
        return { ...initGame(), ...p };
      } catch { /* */ }
    }
    return initGame();
  });
  const [tab, setTab] = useState<"stocks" | "nfts" | "events">("stocks");
  const [buyAmounts, setBuyAmounts] = useState<Record<string, string>>({});
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});
  const [event, setEvent] = useState<string | null>(null);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }, [game]);

  const getNFTMultiplier = useCallback((): number => {
    const ownedNFTs = game.nfts.filter(n => n.owned);
    if (ownedNFTs.length === 0) return 1;
    return Math.max(...ownedNFTs.map(n => n.multiplier));
  }, [game.nfts]);

  const checkAchievements = useCallback((state: GameState): GameState => {
    const checks: Record<string, boolean> = {
      first_trade: state.tradesCount >= 1,
      "10_trades": state.tradesCount >= 10,
      first_nft: state.nfts.some(n => n.owned),
      profit_10k: state.totalEarned >= 10000,
      millionaire: state.balance >= 1000000,
      legendary_stock: state.cryptos.some(s => s.rarity === "legendary" && s.owned > 0),
      all_nfts: state.nfts.every(n => n.owned),
      level5: state.level >= 5,
    };
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
    return { ...state, achievements: updatedAchievements };
  }, []);

  // Price updates: -20% to +100%
  useEffect(() => {
    const interval = setInterval(() => {
      setGame(prev => {
        const eventChance = Math.random();
        let eventMsg: string | null = null;
        let globalBias = 0;

        if (eventChance < 0.02) { globalBias = 0.15; eventMsg = "🚀 שוק חם! מניות עולות!"; }
        else if (eventChance < 0.04) { globalBias = -0.08; eventMsg = "💥 קראש! ירידות!"; }
        else if (eventChance < 0.06) { eventMsg = "🔮 שמועה: מטבע נדיר עומד לזנק!"; }

        const updatedCryptos = prev.cryptos.map(c => {
          // Range: -20% to +100%
          const vol = c.rarity === "legendary" ? 0.25 : c.rarity === "rare" ? 0.15 : 0.1;
          const baseChange = (Math.random() - 0.45 + globalBias) * vol; // slight upward bias
          const clampedChange = Math.max(-0.20, Math.min(1.0, baseChange));
          const newPrice = Math.max(0.01, c.price * (1 + clampedChange));
          return { ...c, prevPrice: c.price, price: newPrice };
        });

        if (eventMsg) setEvent(eventMsg);
        return { ...prev, cryptos: updatedCryptos };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (event) { const t = setTimeout(() => setEvent(null), 3000); return () => clearTimeout(t); }
  }, [event]);

  const addXP = (amount: number, state: GameState): GameState => {
    let xp = state.xp + amount;
    let level = state.level;
    let xpToNext = state.xpToNext;
    while (xp >= xpToNext) { xp -= xpToNext; level++; xpToNext = Math.floor(xpToNext * 1.3); playPremiumSound("levelUp"); }
    return { ...state, xp, level, xpToNext };
  };

  const getDailyQuestIds = () => {
    const d = new Date();
    const day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return [`cryptoEmpire-${day}-0`, `cryptoEmpire-${day}-1`, `cryptoEmpire-${day}-2`];
  };

  const buyCrypto = (crypto: Crypto, amount: number) => {
    const cost = crypto.price * amount;
    if (cost > game.balance || amount <= 0) return;
    playSound("click");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[0], 1);
    setGame(prev => {
      const updatedCryptos = prev.cryptos.map(c => {
        if (c.id !== crypto.id) return c;
        const totalOwned = c.owned + amount;
        const newAvg = (c.avgBuyPrice * c.owned + crypto.price * amount) / totalOwned;
        return { ...c, owned: totalOwned, avgBuyPrice: newAvg };
      });
      let next = { ...prev, balance: prev.balance - cost, cryptos: updatedCryptos, tradesCount: prev.tradesCount + 1, influence: prev.influence + amount };
      next = addXP(15 + amount * 3, next);
      return checkAchievements(next);
    });
    setBuyAmounts(p => ({ ...p, [crypto.id]: "" }));
  };

  const sellCrypto = (crypto: Crypto, amount: number) => {
    if (amount <= 0 || amount > crypto.owned) return;
    const revenue = crypto.price * amount;
    const profit = (crypto.price - crypto.avgBuyPrice) * amount;
    const multiplier = getNFTMultiplier();
    const bonusProfit = profit > 0 ? profit * (multiplier - 1) : 0;
    const totalRevenue = revenue + bonusProfit;

    playPremiumSound("reward");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[1], Math.floor(totalRevenue));
    setGame(prev => {
      const updatedCryptos = prev.cryptos.map(c => c.id === crypto.id ? { ...c, owned: c.owned - amount } : c);
      const earned = profit > 0 ? profit + bonusProfit : 0;
      let next = { ...prev, balance: prev.balance + totalRevenue, cryptos: updatedCryptos, totalEarned: prev.totalEarned + earned, tradesCount: prev.tradesCount + 1 };
      next = addXP(20 + Math.floor(earned / 500), next);
      return checkAchievements(next);
    });
    setSellAmounts(p => ({ ...p, [crypto.id]: "" }));
  };

  const buyNFT = (nft: NFT) => {
    if (nft.owned || nft.value > game.balance) return;
    playPremiumSound("specialSuccess");
    updateQuestProgress("cryptoEmpire", getDailyQuestIds()[0], 1);
    setGame(prev => {
      let next = { ...prev, balance: prev.balance - nft.value, nfts: prev.nfts.map(n => n.id === nft.id ? { ...n, owned: true } : n), tradesCount: prev.tradesCount + 1, influence: prev.influence + 50 };
      next = addXP(100, next);
      return checkAchievements(next);
    });
  };

  const rarityColor = (r: string) => r === "mythic" ? "text-pink-400" : r === "legendary" ? "text-yellow-400" : r === "epic" ? "text-purple-400" : r === "rare" ? "text-blue-400" : "text-muted-foreground";
  const rarityBg = (r: string) => r === "mythic" ? "border-pink-500/40 bg-pink-500/5" : r === "legendary" ? "border-yellow-500/40 bg-yellow-500/5" : r === "epic" ? "border-purple-500/40 bg-purple-500/5" : r === "rare" ? "border-blue-500/40 bg-blue-500/5" : "border-border";
  const rarityLabel = (r: string) => r === "mythic" ? "מיתי" : r === "legendary" ? "אגדי" : r === "epic" ? "אפי" : r === "rare" ? "נדיר" : "רגיל";

  const portfolioValue = game.cryptos.reduce((sum, c) => sum + c.price * c.owned, 0);
  const nftValue = game.nfts.filter(n => n.owned).reduce((sum, n) => sum + n.value, 0);
  const totalWorth = Math.floor(game.balance + portfolioValue + nftValue);
  const currentMultiplier = getNFTMultiplier();

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-yellow-400">💎 אימפריית הקריפטו: שוק סודי</h3>
        <p className="text-sm text-muted-foreground">רמה {game.level} | השפעה: {game.influence} | הישגים: {game.achievements.filter(a => a.unlocked).length}/{game.achievements.length}</p>
      </div>

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

      <DailyQuestPanel gameKey="cryptoEmpire" />

      {/* Balance */}
      <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
        <CardContent className="py-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">${totalWorth.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">מזומן: ${Math.floor(game.balance).toLocaleString()} | תיק: ${Math.floor(portfolioValue).toLocaleString()}</div>
          {currentMultiplier > 1 && <div className="text-xs text-green-400 mt-1">🎯 מכפיל NFT פעיל: ×{currentMultiplier.toFixed(1)}</div>}
        </CardContent>
      </Card>

      {event && <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30 animate-scale-in font-bold">{event}</div>}

      <div className="flex gap-2">
        {(["stocks", "nfts", "events"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="flex-1">
            {t === "stocks" ? "📈 מטבעות (20)" : t === "nfts" ? "🎨 NFT" : "🏆 הישגים"}
          </Button>
        ))}
      </div>

      {tab === "stocks" && (
        <div className="space-y-2">
          {game.cryptos.map(crypto => {
            const changePercent = crypto.prevPrice > 0 ? ((crypto.price - crypto.prevPrice) / crypto.prevPrice) * 100 : 0;
            const profit = crypto.owned > 0 ? (crypto.price - crypto.avgBuyPrice) * crypto.owned : 0;
            return (
              <div key={crypto.id} className={`p-3 rounded-xl border-2 ${rarityBg(crypto.rarity)} transition-all`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-bold ${rarityColor(crypto.rarity)}`}>{crypto.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">{crypto.symbol}</span>
                    {crypto.owned > 0 && (
                      <>
                        <Badge variant="outline" className="mr-2 text-xs">×{crypto.owned}</Badge>
                        <span className={`text-xs ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {profit >= 0 ? "+" : ""}{Math.floor(profit).toLocaleString()}$
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-bold">${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className={`text-xs ${changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Input type="number" placeholder="כמות" value={buyAmounts[crypto.id] || ""} onChange={(e) => setBuyAmounts(p => ({ ...p, [crypto.id]: e.target.value }))} className="w-20 h-8 text-sm" min="1" />
                  <Button size="sm" onClick={() => buyCrypto(crypto, parseInt(buyAmounts[crypto.id]) || 1)} disabled={(crypto.price * (parseInt(buyAmounts[crypto.id]) || 1)) > game.balance}>קנה</Button>
                  {crypto.owned > 0 && (
                    <>
                      <Input type="number" placeholder="מכור" value={sellAmounts[crypto.id] || ""} onChange={(e) => setSellAmounts(p => ({ ...p, [crypto.id]: e.target.value }))} className="w-20 h-8 text-sm" min="1" max={String(crypto.owned)} />
                      <Button size="sm" variant="destructive" onClick={() => sellCrypto(crypto, parseInt(sellAmounts[crypto.id]) || crypto.owned)}>מכור</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "nfts" && (
        <div className="grid gap-3">
          {game.nfts.map(nft => (
            <div key={nft.id} className={`p-4 rounded-xl border-2 ${rarityBg(nft.rarity)} ${nft.owned ? "opacity-70" : ""}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`font-bold ${rarityColor(nft.rarity)}`}>{nft.name}</span>
                  <Badge variant="outline" className={`mr-2 text-xs ${rarityColor(nft.rarity)}`}>{rarityLabel(nft.rarity)}</Badge>
                  <span className="text-xs text-green-400 mr-2">×{nft.multiplier} רווח</span>
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
