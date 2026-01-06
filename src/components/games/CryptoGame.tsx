import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  RefreshCw,
  Coins,
  Skull,
  Zap
} from "lucide-react";

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  isReal: boolean;
  owned: number;
  isCustom?: boolean;
}

interface GameState {
  balance: number;
  cryptos: Crypto[];
  portfolio: { [id: string]: number };
  totalInvested: number;
  history: { action: string; timestamp: number }[];
}

const STORAGE_KEY = "crypto-game-state";

// Top 10 real cryptocurrencies (Hebrew names)
const REAL_CRYPTOS: Omit<Crypto, "id" | "change24h" | "owned">[] = [
  { name: "ביטקוין", symbol: "BTC", price: 95000000, isReal: true },
  { name: "אתריום", symbol: "ETH", price: 3400000, isReal: true },
  { name: "טתר", symbol: "USDT", price: 1, isReal: true },
  { name: "BNB", symbol: "BNB", price: 700, isReal: true },
  { name: "סולנה", symbol: "SOL", price: 180, isReal: true },
  { name: "XRP", symbol: "XRP", price: 2.5, isReal: true },
  { name: "דוג'קוין", symbol: "DOGE", price: 0.35, isReal: true },
  { name: "קרדנו", symbol: "ADA", price: 1.1, isReal: true },
  { name: "אבלנץ'", symbol: "AVAX", price: 40, isReal: true },
  { name: "טרון", symbol: "TRX", price: 0.25, isReal: true },
];

// Fictional cryptocurrencies (90 total with Hebrew names)
const FICTIONAL_CRYPTOS: Omit<Crypto, "id" | "change24h" | "owned">[] = [
  { name: "מטבע הירח", symbol: "MOON", price: 0.0007, isReal: false },
  { name: "כוכב הזהב", symbol: "GSTR", price: 0.001, isReal: false },
  { name: "דרקון דיגיטלי", symbol: "DRGN", price: 0.005, isReal: false },
  { name: "פיניקס קוין", symbol: "PHNX", price: 0.01, isReal: false },
  { name: "נינג'ה טוקן", symbol: "NINJ", price: 0.025, isReal: false },
  { name: "סמוראי", symbol: "SAMR", price: 0.05, isReal: false },
  { name: "אטלנטיס", symbol: "ATLN", price: 0.1, isReal: false },
  { name: "קוסמוס פלוס", symbol: "CSMP", price: 0.15, isReal: false },
  { name: "נבולה", symbol: "NEBL", price: 0.2, isReal: false },
  { name: "קוואנטום", symbol: "QNTM", price: 0.3, isReal: false },
  { name: "מטריקס", symbol: "MTRX", price: 0.5, isReal: false },
  { name: "סייבר", symbol: "CYBR", price: 0.75, isReal: false },
  { name: "האקר", symbol: "HACK", price: 1.0, isReal: false },
  { name: "וירוס", symbol: "VIRS", price: 1.5, isReal: false },
  { name: "פיירוול", symbol: "FRWL", price: 2.0, isReal: false },
  { name: "קריפטון", symbol: "KRPT", price: 2.5, isReal: false },
  { name: "אנומלי", symbol: "ANML", price: 3.0, isReal: false },
  { name: "ספקטרום", symbol: "SPCT", price: 4.0, isReal: false },
  { name: "פאזל", symbol: "PZLE", price: 5.0, isReal: false },
  { name: "לבירינת", symbol: "LBRT", price: 6.0, isReal: false },
  { name: "אוניקס", symbol: "ONYX", price: 7.5, isReal: false },
  { name: "רובי", symbol: "RUBY", price: 10, isReal: false },
  { name: "ספיר", symbol: "SPHR", price: 12, isReal: false },
  { name: "אמרלד", symbol: "EMRL", price: 15, isReal: false },
  { name: "יהלום", symbol: "DIAM", price: 20, isReal: false },
  { name: "פלטינה", symbol: "PLTN", price: 25, isReal: false },
  { name: "טיטניום", symbol: "TITN", price: 30, isReal: false },
  { name: "אורניום", symbol: "URNM", price: 40, isReal: false },
  { name: "פלוטוניום", symbol: "PLUT", price: 50, isReal: false },
  { name: "נפטוניום", symbol: "NPTN", price: 60, isReal: false },
  { name: "גלקסיה", symbol: "GLXY", price: 75, isReal: false },
  { name: "סופרנובה", symbol: "SPNV", price: 100, isReal: false },
  { name: "פולסר", symbol: "PLSR", price: 125, isReal: false },
  { name: "קוואזר", symbol: "QZAR", price: 150, isReal: false },
  { name: "חור שחור", symbol: "BLKH", price: 200, isReal: false },
  { name: "אינפיניטי", symbol: "INFT", price: 250, isReal: false },
  { name: "אטרניטי", symbol: "ETRN", price: 300, isReal: false },
  { name: "דימנשן", symbol: "DMSN", price: 400, isReal: false },
  { name: "פאראלל", symbol: "PRLL", price: 500, isReal: false },
  { name: "מולטיוורס", symbol: "MLTV", price: 600, isReal: false },
  { name: "סינגולריטי", symbol: "SNGL", price: 750, isReal: false },
  { name: "הוריזון", symbol: "HRZN", price: 1000, isReal: false },
  { name: "זניט", symbol: "ZNTH", price: 1250, isReal: false },
  { name: "אפקס", symbol: "APEX", price: 1500, isReal: false },
  { name: "פינקל", symbol: "PNCL", price: 2000, isReal: false },
  { name: "סאמיט", symbol: "SMMT", price: 2500, isReal: false },
  { name: "אקמה", symbol: "ACME", price: 3000, isReal: false },
  { name: "פריים", symbol: "PRME", price: 4000, isReal: false },
  { name: "אלפא", symbol: "ALFA", price: 5000, isReal: false },
  { name: "אומגה", symbol: "OMGA", price: 6000, isReal: false },
  { name: "אלטימט", symbol: "ULTM", price: 7500, isReal: false },
  { name: "סופרים", symbol: "SPRM", price: 10000, isReal: false },
  { name: "מגה", symbol: "MEGA", price: 12500, isReal: false },
  { name: "גיגה", symbol: "GIGA", price: 15000, isReal: false },
  { name: "טרה", symbol: "TERA", price: 20000, isReal: false },
  { name: "פטה", symbol: "PETA", price: 25000, isReal: false },
  { name: "אקסה", symbol: "EXAA", price: 30000, isReal: false },
  { name: "זטה", symbol: "ZETA", price: 40000, isReal: false },
  { name: "יוטה", symbol: "YOTA", price: 50000, isReal: false },
  { name: "ברונטו", symbol: "BRNT", price: 75000, isReal: false },
  { name: "גאופ", symbol: "GEOP", price: 100000, isReal: false },
  { name: "טרדסיליון", symbol: "TRDS", price: 150000, isReal: false },
  { name: "קוואדריליון", symbol: "QUAD", price: 200000, isReal: false },
  { name: "קווינטיליון", symbol: "QUNT", price: 300000, isReal: false },
  { name: "סקסטיליון", symbol: "SXTN", price: 500000, isReal: false },
  { name: "ספטיליון", symbol: "SPTN", price: 750000, isReal: false },
  { name: "אוקטיליון", symbol: "OCTN", price: 1000000, isReal: false },
  { name: "נוניליון", symbol: "NONN", price: 1500000, isReal: false },
  { name: "דסיליון", symbol: "DSCN", price: 2000000, isReal: false },
  { name: "אנדסיליון", symbol: "UNDC", price: 3000000, isReal: false },
  { name: "דואודסיליון", symbol: "DODC", price: 5000000, isReal: false },
  { name: "טרדסיליון", symbol: "TRDC", price: 7500000, isReal: false },
  { name: "קוואטורדסיליון", symbol: "QTDC", price: 10000000, isReal: false },
  { name: "קווינדסיליון", symbol: "QNDC", price: 15000000, isReal: false },
  { name: "סקסדסיליון", symbol: "SXDC", price: 20000000, isReal: false },
  { name: "ספטנדסיליון", symbol: "SPDC", price: 30000000, isReal: false },
  { name: "אוקטודסיליון", symbol: "OCDC", price: 40000000, isReal: false },
  { name: "נובמדסיליון", symbol: "NVDC", price: 50000000, isReal: false },
  { name: "ויגינטיליון", symbol: "VGNT", price: 75000000, isReal: false },
  { name: "גוגול", symbol: "GOGL", price: 100000000, isReal: false },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const initializeCryptos = (): Crypto[] => {
  const all = [...REAL_CRYPTOS, ...FICTIONAL_CRYPTOS].map(c => ({
    ...c,
    id: generateId(),
    change24h: (Math.random() - 0.5) * 40, // -20% to +20%
    owned: 0,
  }));
  return all.sort((a, b) => a.price - b.price);
};

export const CryptoGame = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCryptoName, setNewCryptoName] = useState("");
  const [newCryptoAmount, setNewCryptoAmount] = useState("");
  const [newCryptoPrice, setNewCryptoPrice] = useState("");
  const [filter, setFilter] = useState<"all" | "real" | "fictional" | "owned">("all");
  const { toast } = useToast();

  // Load game state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
      } catch (e) {
        console.error("Error loading game state:", e);
        initializeNewGame();
      }
    } else {
      initializeNewGame();
    }
  }, []);

  // Save game state to localStorage
  useEffect(() => {
    if (gameState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  const initializeNewGame = () => {
    setGameState({
      balance: 1,
      cryptos: initializeCryptos(),
      portfolio: {},
      totalInvested: 0,
      history: [{ action: "משחק התחיל עם $1", timestamp: Date.now() }],
    });
  };

  const updatePrices = useCallback(() => {
    if (!gameState) return;

    setGameState(prev => {
      if (!prev) return prev;

      const updatedCryptos = prev.cryptos.map(crypto => {
        // More volatile price changes for higher risk/reward
        const volatility = crypto.price > 10000 ? 0.3 : crypto.price > 100 ? 0.2 : 0.15;
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = Math.max(0.0001, crypto.price * (1 + change));
        
        // Small chance of crash for expensive coins
        const crashChance = crypto.price > 50000 ? 0.02 : crypto.price > 1000 ? 0.01 : 0.005;
        const isCrash = Math.random() < crashChance;
        
        const finalPrice = isCrash ? crypto.price * (0.3 + Math.random() * 0.4) : newPrice;
        
        return {
          ...crypto,
          price: finalPrice,
          change24h: ((finalPrice - crypto.price) / crypto.price) * 100,
        };
      });

      return {
        ...prev,
        cryptos: updatedCryptos,
      };
    });
  }, [gameState]);

  // Update prices every 5 seconds
  useEffect(() => {
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [updatePrices]);

  const buyCrypto = (crypto: Crypto, amount: number) => {
    if (!gameState) return;

    const totalCost = crypto.price * amount;
    if (totalCost > gameState.balance) {
      toast({ title: "אין מספיק כסף!", variant: "destructive" });
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;

      const newPortfolio = {
        ...prev.portfolio,
        [crypto.id]: (prev.portfolio[crypto.id] || 0) + amount,
      };

      const updatedCryptos = prev.cryptos.map(c =>
        c.id === crypto.id ? { ...c, owned: (c.owned || 0) + amount } : c
      );

      return {
        ...prev,
        balance: prev.balance - totalCost,
        portfolio: newPortfolio,
        cryptos: updatedCryptos,
        totalInvested: prev.totalInvested + totalCost,
        history: [
          { action: `קנית ${amount} ${crypto.name} ב-$${totalCost.toFixed(2)}`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    toast({ title: `קנית ${amount} ${crypto.name}!` });
    setBuyAmount("");
    setSelectedCrypto(null);
  };

  const sellCrypto = (crypto: Crypto, amount: number) => {
    if (!gameState) return;

    const owned = gameState.portfolio[crypto.id] || 0;
    if (amount > owned) {
      toast({ title: "אין לך מספיק מטבעות!", variant: "destructive" });
      return;
    }

    const totalValue = crypto.price * amount;

    setGameState(prev => {
      if (!prev) return prev;

      const newOwned = (prev.portfolio[crypto.id] || 0) - amount;
      const newPortfolio = { ...prev.portfolio };
      if (newOwned <= 0) {
        delete newPortfolio[crypto.id];
      } else {
        newPortfolio[crypto.id] = newOwned;
      }

      const updatedCryptos = prev.cryptos.map(c =>
        c.id === crypto.id ? { ...c, owned: Math.max(0, (c.owned || 0) - amount) } : c
      );

      return {
        ...prev,
        balance: prev.balance + totalValue,
        portfolio: newPortfolio,
        cryptos: updatedCryptos,
        history: [
          { action: `מכרת ${amount} ${crypto.name} ב-$${totalValue.toFixed(2)}`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    toast({ title: `מכרת ${amount} ${crypto.name} ב-$${totalValue.toFixed(2)}!` });
  };

  const createCustomCrypto = () => {
    if (!gameState) return;
    if (!newCryptoName.trim() || !newCryptoAmount || !newCryptoPrice) {
      toast({ title: "מלא את כל השדות!", variant: "destructive" });
      return;
    }

    const amount = parseFloat(newCryptoAmount);
    const pricePerCoin = parseFloat(newCryptoPrice);
    const totalCost = amount * pricePerCoin;

    if (totalCost > gameState.balance) {
      toast({ title: "אין מספיק כסף ליצירת המטבע!", variant: "destructive" });
      return;
    }

    const newCrypto: Crypto = {
      id: generateId(),
      name: newCryptoName.trim(),
      symbol: newCryptoName.trim().substring(0, 4).toUpperCase(),
      price: pricePerCoin,
      change24h: 0,
      isReal: false,
      owned: amount,
      isCustom: true,
    };

    setGameState(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        balance: prev.balance - totalCost,
        cryptos: [...prev.cryptos, newCrypto].sort((a, b) => a.price - b.price),
        portfolio: {
          ...prev.portfolio,
          [newCrypto.id]: amount,
        },
        history: [
          { action: `יצרת מטבע חדש: ${newCryptoName} (${amount} מטבעות ב-$${totalCost.toFixed(2)})`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    toast({ title: `המטבע ${newCryptoName} נוצר בהצלחה!` });
    setNewCryptoName("");
    setNewCryptoAmount("");
    setNewCryptoPrice("");
    setShowCreateDialog(false);
  };

  const resetGame = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות תימחק!")) {
      localStorage.removeItem(STORAGE_KEY);
      initializeNewGame();
      toast({ title: "המשחק אופס!" });
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const getPortfolioValue = () => {
    if (!gameState) return 0;
    return Object.entries(gameState.portfolio).reduce((total, [id, amount]) => {
      const crypto = gameState.cryptos.find(c => c.id === id);
      return total + (crypto ? crypto.price * amount : 0);
    }, 0);
  };

  const filteredCryptos = gameState?.cryptos.filter(crypto => {
    switch (filter) {
      case "real": return crypto.isReal;
      case "fictional": return !crypto.isReal;
      case "owned": return (crypto.owned || 0) > 0;
      default: return true;
    }
  }) || [];

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalValue = gameState.balance + getPortfolioValue();
  const profit = totalValue - 1;
  const profitPercent = profit * 100;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-green-500 mb-2 flex items-center justify-center gap-2">
          <Zap className="w-8 h-8" />
          קריפטו־גיים
          <Zap className="w-8 h-8" />
        </h2>
        <p className="text-muted-foreground">סחר במטבעות קריפטו וירטואליים!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-900/50 to-green-950/50 border-green-500/30">
          <div className="text-sm text-muted-foreground">יתרה</div>
          <div className="text-2xl font-bold text-green-400">{formatPrice(gameState.balance)}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/30">
          <div className="text-sm text-muted-foreground">ערך תיק</div>
          <div className="text-2xl font-bold text-blue-400">{formatPrice(getPortfolioValue())}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-purple-500/30">
          <div className="text-sm text-muted-foreground">סה"כ</div>
          <div className="text-2xl font-bold text-purple-400">{formatPrice(totalValue)}</div>
        </Card>
        <Card className={`p-4 ${profit >= 0 ? 'bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-emerald-500/30' : 'bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500/30'}`}>
          <div className="text-sm text-muted-foreground">רווח/הפסד</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20">
              <Plus className="w-4 h-4 ml-2" />
              צור מטבע משלך
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>צור מטבע קריפטו חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">שם המטבע (בעברית)</label>
                <Input
                  value={newCryptoName}
                  onChange={(e) => setNewCryptoName(e.target.value)}
                  placeholder="שם המטבע"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">כמות מטבעות</label>
                <Input
                  type="number"
                  value={newCryptoAmount}
                  onChange={(e) => setNewCryptoAmount(e.target.value)}
                  placeholder="כמות"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מחיר למטבע ($)</label>
                <Input
                  type="number"
                  value={newCryptoPrice}
                  onChange={(e) => setNewCryptoPrice(e.target.value)}
                  placeholder="מחיר"
                  min="0.0001"
                  step="0.0001"
                />
              </div>
              {newCryptoAmount && newCryptoPrice && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">עלות כוללת: <strong>{formatPrice(parseFloat(newCryptoAmount) * parseFloat(newCryptoPrice))}</strong></div>
                  <div className="text-xs text-muted-foreground">יתרה נוכחית: {formatPrice(gameState.balance)}</div>
                </div>
              )}
              <Button 
                onClick={createCustomCrypto} 
                className="w-full"
                disabled={!newCryptoName || !newCryptoAmount || !newCryptoPrice || 
                  (parseFloat(newCryptoAmount) * parseFloat(newCryptoPrice)) > gameState.balance}
              >
                <Coins className="w-4 h-4 ml-2" />
                צור מטבע
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={resetGame} className="border-red-500/50 text-red-400 hover:bg-red-500/20">
          <Skull className="w-4 h-4 ml-2" />
          אפס משחק
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "הכל" },
          { value: "real", label: "אמיתיים" },
          { value: "fictional", label: "בדיוניים" },
          { value: "owned", label: "שלי" },
        ].map(f => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value as typeof filter)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Crypto List */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCryptos.map((crypto) => (
            <Card
              key={crypto.id}
              className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                crypto.isReal ? 'border-yellow-500/30' : crypto.isCustom ? 'border-purple-500/30' : 'border-green-500/30'
              } ${selectedCrypto?.id === crypto.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedCrypto(crypto)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{crypto.name}</span>
                  {crypto.isReal && <Badge variant="outline" className="text-yellow-500 border-yellow-500">אמיתי</Badge>}
                  {crypto.isCustom && <Badge variant="outline" className="text-purple-500 border-purple-500">שלי</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{crypto.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{formatPrice(crypto.price)}</span>
                <span className={`text-sm flex items-center gap-1 ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {crypto.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                </span>
              </div>
              {(crypto.owned || 0) > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  ברשותך: {crypto.owned} ({formatPrice(crypto.price * (crypto.owned || 0))})
                </div>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Buy/Sell Dialog */}
      {selectedCrypto && (
        <Dialog open={!!selectedCrypto} onOpenChange={() => setSelectedCrypto(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {selectedCrypto.name} ({selectedCrypto.symbol})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{formatPrice(selectedCrypto.price)}</div>
                <div className={`text-sm ${selectedCrypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedCrypto.change24h >= 0 ? '+' : ''}{selectedCrypto.change24h.toFixed(2)}%
                </div>
              </div>

              {(selectedCrypto.owned || 0) > 0 && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  ברשותך: <strong>{selectedCrypto.owned}</strong> מטבעות
                  <br />
                  <span className="text-sm text-muted-foreground">
                    שווי: {formatPrice(selectedCrypto.price * (selectedCrypto.owned || 0))}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="כמות"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                {buyAmount && (
                  <div className="text-sm text-muted-foreground text-center">
                    עלות: {formatPrice(selectedCrypto.price * parseFloat(buyAmount || "0"))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => buyCrypto(selectedCrypto, parseFloat(buyAmount || "0"))}
                  disabled={!buyAmount || parseFloat(buyAmount) * selectedCrypto.price > gameState.balance}
                >
                  קנה
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => sellCrypto(selectedCrypto, parseFloat(buyAmount || "0"))}
                  disabled={!buyAmount || parseFloat(buyAmount) > (selectedCrypto.owned || 0)}
                >
                  מכור
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                {[0.25, 0.5, 0.75, 1].map(percent => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxCanBuy = gameState.balance / selectedCrypto.price;
                      setBuyAmount((maxCanBuy * percent).toFixed(2));
                    }}
                  >
                    {percent * 100}%
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Warning */}
      <Card className="p-4 bg-yellow-900/20 border-yellow-500/30">
        <p className="text-center text-sm text-yellow-400">
          ⚠️ זהירות! מחירים גבוהים יותר = רווחים גבוהים יותר אבל גם סיכון גבוה יותר להפסיד הכל!
        </p>
      </Card>
    </div>
  );
};
