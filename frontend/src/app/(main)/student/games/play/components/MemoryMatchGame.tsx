"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Gamepad2 } from "lucide-react";
import { GameChallenge } from "@/services/gameService";
import { formatTemplate } from "@/utils/mathService";

interface MemoryMatchGameProps {
  challenge: GameChallenge;
  timeSpent: number;
  onEndGame: (score: number) => void;
  onMove: () => void;
}

export default function MemoryMatchGame({
  challenge,
  timeSpent,
  onEndGame,
  onMove,
}: MemoryMatchGameProps) {
  const t = useTranslations("Games");
  const locale = useLocale();

  const [cards, setCards] = useState<Array<{
    id: number;
    content: string;
    type: 'formula' | 'value';
    matched: boolean;
    flipped: boolean;
    val: string;
  }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  // Setup memory match cards once mounted
  useEffect(() => {
    const list = challenge.config.questions.slice(0, 6); // Take 6 questions for 12 cards
    const formulaCards = list.map((q, idx) => {
      const bodyTemplate =
        locale === "vi"
          ? q.body_template_vi || q.body_template_en
          : q.body_template_en || q.body_template_vi;
      const formatted = formatTemplate(bodyTemplate || "", q.generated_variables);
      const displayFormula = formatted.replace(/\$/g, "").trim();
      const val = q.right_answers[0];
      return {
        id: idx * 2,
        content: displayFormula,
        type: 'formula' as const,
        matched: false,
        flipped: false,
        val
      };
    });
    
    const valueCards = list.map((q, idx) => {
      const val = q.right_answers[0];
      return {
        id: idx * 2 + 1,
        content: q.right_answers[0],
        type: 'value' as const,
        matched: false,
        flipped: false,
        val
      };
    });

    const combined = [...formulaCards, ...valueCards].sort(() => 0.5 - Math.random());
    setCards(combined);
  }, [challenge, locale]);

  const handleCardClick = (id: number) => {
    if (selectedCards.length >= 2) return;
    
    const cardIdx = cards.findIndex(c => c.id === id);
    if (cards[cardIdx].matched || cards[cardIdx].flipped) return;

    const nextCards = [...cards];
    nextCards[cardIdx].flipped = true;
    setCards(nextCards);

    const nextSelected = [...selectedCards, id];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      onMove();
      const card1 = cards.find(c => c.id === nextSelected[0])!;
      const card2 = cards.find(c => c.id === nextSelected[1])!;

      if (card1.type !== card2.type && card1.val === card2.val) {
        // Match found!
        setTimeout(() => {
          const matchedCards = nextCards.map(c => {
            if (c.id === card1.id || c.id === card2.id) {
              return { ...c, matched: true, flipped: true };
            }
            return c;
          });
          setCards(matchedCards);
          setSelectedCards([]);

          const allMatched = matchedCards.every(c => c.matched);
          if (allMatched) {
            // Final score calculated as speed match points
            const calculatedScore = Math.max(10, Math.min(100, Math.floor((300 - timeSpent) * 0.3)));
            onEndGame(calculatedScore);
          }
        }, 600);
      } else {
        // Match failed, flip back
        setTimeout(() => {
          const resetCards = nextCards.map(c => {
            if (c.id === card1.id || c.id === card2.id) {
              return { ...c, flipped: false };
            }
            return c;
          });
          setCards(resetCards);
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4 z-10">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => handleCardClick(card.id)}
          disabled={card.matched || card.flipped}
          className={`h-28 sm:h-32 rounded-2xl border flex items-center justify-center text-center p-2 transition-all duration-300 transform font-black select-none
            ${card.matched 
              ? 'bg-sol-green/10 border-sol-green/30 text-sol-green scale-95 opacity-60 shadow-inner rotate-y-180 animate-pop-success' 
              : card.flipped
                ? 'bg-sol-accent/10 border-sol-accent text-sol-accent rotate-y-180 scale-102 shadow-md shadow-sol-accent/5'
                : 'bg-sol-bg border-sol-border/30 hover:border-sol-accent/30 hover:scale-102 cursor-pointer'
            }
          `}
        >
          {card.flipped || card.matched ? (
            <span 
              className={`tracking-tight font-black rotate-y-180 max-h-full overflow-y-auto scrollbar-hidden break-words w-full px-1
                ${card.content.length > 120
                  ? 'text-[10px] sm:text-[11px] leading-tight'
                  : card.content.length > 60
                    ? 'text-[11px] sm:text-xs leading-snug'
                    : 'text-xs sm:text-sm leading-normal'
                }
              `}
            >
              {card.content}
            </span>
          ) : (
            <Gamepad2 className="text-sol-muted opacity-30 group-hover:opacity-60" size={24} />
          )}
        </button>
      ))}
    </div>
  );
}
