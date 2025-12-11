import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Quest {
  id: number;
  title: string;
  description: string;
  icon: string;
  checkCompleted: () => boolean;
}

export const HalloweenQuests = () => {
  const [completedQuests, setCompletedQuests] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('halloween-completed-quests');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const quests: Quest[] = [
    {
      id: 1,
      title: 'שחקן מתחיל',
      description: 'הצטרף לאירוע Halloween והתחל לשחק',
      icon: '🎃',
      checkCompleted: () => true,
    },
    {
      id: 2,
      title: 'ציד דלעות',
      description: 'הגע ל-100 נקודות במשחק ליל דלעות',
      icon: '🎃',
      checkCompleted: () => {
        const score = parseInt(localStorage.getItem('halloween-pumpkin-night-score') || '0');
        return score >= 100;
      },
    },
    {
      id: 3,
      title: 'בורח מוצלח',
      description: 'ברח מבית הספר הרדוף ברמה 3',
      icon: '🏫',
      checkCompleted: () => {
        const level = parseInt(localStorage.getItem('halloween-haunted-school-best-level') || '1');
        return level >= 3;
      },
    },
    {
      id: 4,
      title: 'מוצא דלתות',
      description: 'מצא את הדלת הנכונה 5 פעמים',
      icon: '🚪',
      checkCompleted: () => {
        const wins = parseInt(localStorage.getItem('halloween-door-finder-wins') || '0');
        return wins >= 5;
      },
    },
    {
      id: 5,
      title: 'צייד רוחות',
      description: 'תפוס 15 רוחות במרדף הרוחות',
      icon: '👻',
      checkCompleted: () => {
        const caught = parseInt(localStorage.getItem('halloween-ghost-hunter-caught') || '0');
        return caught >= 15;
      },
    },
    {
      id: 6,
      title: 'לוכד עכבישים',
      description: 'תפוס 30 עכבישים במשחק לכידת העכבישים',
      icon: '🕷️',
      checkCompleted: () => {
        const caught = parseInt(localStorage.getItem('halloween-spider-catcher-score') || '0');
        return caught >= 30;
      },
    },
    {
      id: 7,
      title: 'מאסטר דלעות',
      description: 'הגע ל-300 נקודות במשחק ליל דלעות',
      icon: '🎃',
      checkCompleted: () => {
        const score = parseInt(localStorage.getItem('halloween-pumpkin-night-score') || '0');
        return score >= 300;
      },
    },
    {
      id: 8,
      title: 'שורד אמיתי',
      description: 'הגע לרמה 5 במדינת הרפל',
      icon: '🏫',
      checkCompleted: () => {
        const level = parseInt(localStorage.getItem('halloween-haunted-school-best-level') || '1');
        return level >= 5;
      },
    },
    {
      id: 9,
      title: 'מלך המשחקים',
      description: 'שחק בכל 5 המשחקים לפחות פעם אחת',
      icon: '👑',
      checkCompleted: () => {
        const games = [
          'halloween-pumpkin-night-score',
          'halloween-haunted-school-best-level',
          'halloween-door-finder-wins',
          'halloween-ghost-hunter-caught',
          'halloween-spider-catcher-score',
        ];
        return games.every(game => localStorage.getItem(game) !== null);
      },
    },
    {
      id: 10,
      title: 'אלוף Halloween',
      description: 'השלם את כל 9 הקוואסטים הקודמים',
      icon: '🏆',
      checkCompleted: () => completedQuests.size >= 9,
    },
  ];

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const newCompleted = new Set(completedQuests);
      let hasChanges = false;

      quests.forEach((quest) => {
        if (!completedQuests.has(quest.id) && quest.checkCompleted()) {
          newCompleted.add(quest.id);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setCompletedQuests(newCompleted);
        localStorage.setItem('halloween-completed-quests', JSON.stringify([...newCompleted]));
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [completedQuests]);

  const activeQuests = quests.filter(q => !completedQuests.has(q.id));
  const progress = (completedQuests.size / quests.length) * 100;

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* Progress Section */}
      <div className="bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-lg border-2 border-orange-500 p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">🎃</div>
          <h3 className="text-2xl font-bold text-orange-400">
            השלמת {completedQuests.size} מתוך {quests.length} קוואסטים
          </h3>
          <Progress value={progress} className="h-4" />
          <p className="text-lg text-purple-300">
            {completedQuests.size === quests.length
              ? '🎉 כל הכבוד! השלמת את כל קוואסטי ה-Halloween!'
              : `עוד ${quests.length - completedQuests.size} קוואסטים להשלמה!`}
          </p>
        </div>
      </div>

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xl font-bold text-orange-400 text-center">קוואסטים פעילים</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeQuests.map((quest) => (
              <Card
                key={quest.id}
                className="p-4 bg-gradient-to-br from-purple-900/50 to-orange-900/50 border-2 border-orange-500/50 hover:border-orange-500 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{quest.icon}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h5 className="text-lg font-bold text-orange-300">{quest.title}</h5>
                      <Badge variant="outline" className="text-xs">
                        #{quest.id}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">{quest.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Message */}
      {completedQuests.size === quests.length && (
        <div className="text-center p-8 bg-gradient-to-br from-green-500/20 to-yellow-500/20 rounded-lg border-2 border-green-500 animate-fade-in">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-3xl font-bold text-yellow-400 mb-2">
            אלוף Halloween!
          </h3>
          <p className="text-lg text-green-300">
            השלמת את כל הקוואסטים בהצלחה! אתה אגדה אמיתית! 🎃👻🦇
          </p>
        </div>
      )}
    </div>
  );
};
