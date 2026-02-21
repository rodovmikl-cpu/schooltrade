import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";

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

interface GameState {
  balance: number;
  stocks: SecretStock[];
  nfts: NFT[];
  influence: number;
  totalEarned: number;
  level: number;
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

const generateId = () => Math.random().toString(36).substring(2, 9);

const initGame = (): GameState => ({
  balance: 10000,
  stocks: INITIAL_STOCKS.map(s => ({ ...s, id: generateId(), change: (Math.random() - 0.4) * 30, owned: 0 })),
  nfts: INITIAL_NFTS.map(n => ({ ...n, id: generateId(), owned: false })),
  influence: 0,
  totalEarned: 0,
  level: 1,
});

export const CryptoEmpire = () => {
  const [game, setGame] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return initGame();
  });
  const [tab, setTab] = useState<"stocks" | "nfts" | "events">("stocks");
  const [buyAmounts, setBuyAmounts] = useState<Record<string, string>>({});
  const [event, setEvent] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }, [game]);

  // Price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGame(prev => {
        // Random event
        const eventChance = Math.random();
        let eventMsg: string | null = null;

        const updatedStocks = prev.stocks.map(s => {
          let bias = 0.03;
          let vol = s.rarity === "legendary" ? 0.4 : s.rarity === "rare" ? 0.3 : 0.2;

          // Events affect prices
          if (eventChance < 0.03) {
            bias = 0.5; // Pump!
            eventMsg = `🚀 שוק חם! מניות עולות בחדות!`;
          } else if (eventChance < 0.05) {
            bias = -0.3; // Crash
            eventMsg = `💥 קראש! ירידות בשוק הסודי!`;
          } else if (eventChance < 0.07) {
            eventMsg = `🔮 שמועה: מטבע נדיר עומד לזנק!`;
          }

          const change = (Math.random() - 0.5 + bias) * vol * 2;
          return {
            ...s,
            price: Math.max(1, s.price * (1 + change / 100 * 10)),
            change,
          };
        });

        if (eventMsg) setEvent(eventMsg);

        return { ...prev, stocks: updatedStocks };
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Clear event after 3s
  useEffect(() => {
    if (event) {
      const t = setTimeout(() => setEvent(null), 3000);
      return () => clearTimeout(t);
    }
  }, [event]);

  const buyStock = (stock: SecretStock, amount: number) => {
    const cost = stock.price * amount;
    if (cost > game.balance) return;
    playSound("click");
    setGame(prev => ({
      ...prev,
      balance: prev.balance - cost,
      stocks: prev.stocks.map(s => s.id === stock.id ? { ...s, owned: s.owned + amount } : s),
      influence: prev.influence + amount,
    }));
    setBuyAmounts(p => ({ ...p, [stock.id]: "" }));
  };

  const sellStock = (stock: SecretStock) => {
    if (stock.owned <= 0) return;
    const revenue = stock.price * stock.owned;
    playPremiumSound("reward");
    setGame(prev => ({
      ...prev,
      balance: prev.balance + revenue,
      stocks: prev.stocks.map(s => s.id === stock.id ? { ...s, owned: 0 } : s),
      totalEarned: prev.totalEarned + revenue,
      level: Math.floor((prev.totalEarned + revenue) / 100000) + 1,
    }));
  };

  const buyNFT = (nft: NFT) => {
    if (nft.owned || nft.value > game.balance) return;
    playPremiumSound("specialSuccess");
    setGame(prev => ({
      ...prev,
      balance: prev.balance - nft.value,
      nfts: prev.nfts.map(n => n.id === nft.id ? { ...n, owned: true } : n),
      influence: prev.influence + 50,
    }));
  };

  const rarityColor = (r: string) => r === "legendary" ? "text-yellow-400" : r === "epic" ? "text-purple-400" : r === "rare" ? "text-blue-400" : "text-muted-foreground";
  const rarityBg = (r: string) => r === "legendary" ? "border-yellow-500/40 bg-yellow-500/5" : r === "epic" ? "border-purple-500/40 bg-purple-500/5" : r === "rare" ? "border-blue-500/40 bg-blue-500/5" : "border-border";

  const totalPoints = Math.floor(game.totalEarned + game.balance + game.nfts.filter(n => n.owned).reduce((a, n) => a + n.value, 0));

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-yellow-400">💎 אימפריית הקריפטו: שוק סודי</h3>
        <p className="text-sm text-muted-foreground">רמה {game.level} | השפעה: {game.influence}</p>
      </div>

      {/* Balance */}
      <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
        <CardContent className="py-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">${totalPoints.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">מזומן: ${Math.floor(game.balance).toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Event banner */}
      {event && (
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30 animate-scale-in font-bold">
          {event}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["stocks", "nfts", "events"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="flex-1">
            {t === "stocks" ? "📈 מניות סודיות" : t === "nfts" ? "🎨 NFT נדירים" : "⚡ אירועים"}
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
                <Input
                  type="number"
                  placeholder="כמות"
                  value={buyAmounts[stock.id] || ""}
                  onChange={(e) => setBuyAmounts(p => ({ ...p, [stock.id]: e.target.value }))}
                  className="w-24 h-8 text-sm"
                  min="1"
                />
                <Button size="sm" onClick={() => buyStock(stock, parseInt(buyAmounts[stock.id]) || 1)} disabled={(stock.price * (parseInt(buyAmounts[stock.id]) || 1)) > game.balance}>
                  קנה
                </Button>
                {stock.owned > 0 && (
                  <Button size="sm" variant="destructive" onClick={() => sellStock(stock)}>
                    מכור הכל
                  </Button>
                )}
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
                  {nft.owned ? (
                    <span className="text-xs text-green-400">✓ בבעלותך</span>
                  ) : (
                    <Button size="sm" onClick={() => buyNFT(nft)} disabled={nft.value > game.balance}>
                      רכוש
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "events" && (
        <Card>
          <CardContent className="py-6 text-center space-y-4">
            <p className="text-lg font-bold">⚡ אירועים גלובליים</p>
            <p className="text-muted-foreground">אירועים מתרחשים אוטומטית כל כמה שניות!</p>
            <div className="space-y-2 text-sm text-right">
              <p>🚀 <strong>שוק חם</strong> — מניות עולות בחדות</p>
              <p>💥 <strong>קראש</strong> — ירידות חדות</p>
              <p>🔮 <strong>שמועות</strong> — רמזים על זינוקים</p>
              <p>🏆 <strong>מכירה פומבית</strong> — NFT נדירים מופיעים</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-bold">💰 הלידרבורד הגלובלי</p>
              <p className="text-muted-foreground text-sm">שווי כולל: ${totalPoints.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
