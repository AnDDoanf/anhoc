"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Scale } from "lucide-react";
import { ChoiceOption, normalizeQuestionType } from "@/utils/questionType";
import { formatTemplate } from "@/utils/mathService";

interface BalanceScaleGameProps {
  question: any;
  choiceOptions: ChoiceOption[];
  onSubmitAnswer: (value: string) => void;
  feedback: { isCorrect: boolean; show: boolean } | null;
  onEndGame: () => void;
  questionIndex: number;
}

export default function BalanceScaleGame({
  question,
  choiceOptions,
  onSubmitAnswer,
  feedback,
  onEndGame,
  questionIndex,
}: BalanceScaleGameProps) {
  const t = useTranslations("Games");
  const locale = useLocale();

  const [tilt, setTilt] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const questionType = normalizeQuestionType(question?.template_type);
  const currentQuestionBodyTemplate =
    locale === "vi"
      ? question?.body_template_vi || question?.body_template_en || ""
      : question?.body_template_en || question?.body_template_vi || "";

  const trueFalseOptions = [
    { label: t("trueOption"), value: "true" },
    { label: t("falseOption"), value: "false" },
  ];

  const optionsToRender = questionType === "true_false" ? trueFalseOptions : choiceOptions;

  const isOptionCorrect = (option: ChoiceOption) => {
    return question?.right_answers.some(
      (ans: string) => ans.trim().toLowerCase() === option.value.trim().toLowerCase()
    ) || false;
  };

  // Reset physics states completely on new question load (keyed by index)
  useEffect(() => {
    setTimeRemaining(15);
    setHoveredIdx(null);
    setTilt(0);
    setWrongCount(0);
    setIsCollapsed(false);
  }, [questionIndex]);

  // Standard second-by-second timer decrement
  useEffect(() => {
    if (isCollapsed || feedback) return;

    const interval = setInterval(() => {
      setTimeRemaining((prevTime) => Math.max(0, prevTime - 1));
      setTilt((prevTilt) => Math.min(35, prevTilt + 1.2)); // Slow rightward tilt
    }, 1000);

    return () => clearInterval(interval);
  }, [isCollapsed, feedback]);

  // Dedicated React effect to handle collapse on timeout and end the game
  useEffect(() => {
    if (timeRemaining === 0 && !isCollapsed && !feedback) {
      setIsCollapsed(true);
      setTilt(35);
      
      const timeoutId = setTimeout(() => {
        onEndGame();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [timeRemaining, isCollapsed, feedback, onEndGame]);

  const handleMouseEnter = (idx: number) => {
    if (feedback || isCollapsed) return;
    setHoveredIdx(idx);
  };

  const handleMouseLeave = () => {
    if (feedback || isCollapsed) return;
    setHoveredIdx(null);
  };

  const handleClick = (option: ChoiceOption) => {
    if (feedback || isCollapsed) return;
    const correct = isOptionCorrect(option);

    if (correct) {
      setTilt(0);
      setWrongCount(0);
      setTimeout(() => {
        onSubmitAnswer(option.value);
      }, 850);
    } else {
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      
      const targetTilt = Math.min(35, nextWrong * 12);
      setTilt(targetTilt);

      if (nextWrong >= 3) {
        setIsCollapsed(true);
        setTilt(35);
        // End the game session and submit the attempt on 3rd wrong
        setTimeout(() => {
          onEndGame();
        }, 1200);
      } else {
        setTimeout(() => {
          onSubmitAnswer(option.value);
        }, 850);
      }
    }
  };

  // Determine if the scale is shaking
  const isShaking = !feedback && (isCollapsed || timeRemaining <= 5 || wrongCount > 0);

  return (
    <div className="space-y-6 py-4 z-10 flex flex-col justify-between h-full flex-1 relative min-h-[360px]">
      
      {/* Title & Self-Falling Time Bar */}
      <div className="text-center space-y-2 py-1 z-10 w-full max-w-xs mx-auto">
        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">{t("solveNow")}</p>
        <div className="w-full h-1.5 bg-sol-border/10 rounded-full overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-1000 ease-linear rounded-full
              ${timeRemaining <= 5 ? "bg-sol-red animate-pulse" : "bg-sol-accent"}
            `}
            style={{ width: `${(timeRemaining / 15) * 100}%` }}
          />
        </div>
        <p className="text-[9px] font-black text-sol-muted uppercase tracking-wider">
          {timeRemaining <= 5
            ? t("balanceScaleUnstable", { seconds: timeRemaining })
            : t("balanceTimeToSettle", { seconds: timeRemaining })}
        </p>
      </div>

      {/* The Physical Balance Scale Board */}
      <div className="relative w-full h-60 flex flex-col items-center justify-end overflow-visible z-10 py-2">
        {/* Scale Stand / Pivot */}
        <div className="absolute bottom-0 w-5 h-32 bg-sol-border/30 rounded-t-lg flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-sol-accent" />
        </div>
        <div className="absolute bottom-0 w-20 h-2 bg-sol-border/30 rounded-full" />

        {/* Dynamic Tilting Beam */}
        <div 
          className={`absolute bottom-24 w-[75%] h-2 bg-sol-accent rounded-full transition-transform duration-500 ease-out origin-center flex justify-between items-center px-1
            ${isShaking ? "animate-scale-shake" : ""}
          `}
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {/* Left Pan suspension & Plate */}
          <div 
            className="w-16 h-24 absolute -left-8 -top-1 transition-transform duration-500 ease-out origin-top flex flex-col items-center"
            style={{ transform: `rotate(${-tilt}deg)` }}
          >
            <svg className="w-14 h-14 text-sol-accent/30" viewBox="0 0 100 100" fill="none">
              <line x1="50" y1="0" x2="10" y2="80" stroke="currentColor" strokeWidth="4" />
              <line x1="50" y1="0" x2="90" y2="80" stroke="currentColor" strokeWidth="4" />
            </svg>
            <div className="w-16 h-3.5 bg-sol-surface border border-sol-accent/40 rounded-b-xl flex items-center justify-center shadow-md relative -mt-3.5">
              <span className="text-[8px] font-black uppercase text-sol-accent/60">{t("balanceEquation")}</span>
            </div>
          </div>

          {/* Right Pan suspension & Plate */}
          <div 
            className="w-16 h-24 absolute -right-8 -top-1 transition-transform duration-500 ease-out origin-top flex flex-col items-center"
            style={{ transform: `rotate(${-tilt}deg)` }}
          >
            <svg className="w-14 h-14 text-sol-accent/30" viewBox="0 0 100 100" fill="none">
              <line x1="50" y1="0" x2="10" y2="80" stroke="currentColor" strokeWidth="4" />
              <line x1="50" y1="0" x2="90" y2="80" stroke="currentColor" strokeWidth="4" />
            </svg>
            <div className="w-16 h-3.5 bg-sol-surface border border-sol-accent/40 rounded-b-xl flex items-center justify-center shadow-md relative -mt-3.5">
              <span className="text-[8px] font-black uppercase text-sol-accent/60">{t("balanceWeight")}</span>
            </div>
          </div>
        </div>

        {/* Left Pan equation item */}
        <div className="absolute bottom-16 left-[8%] sm:left-[15%] w-28 flex flex-col items-center text-center z-20">
          <div className="bg-sol-surface/90 border border-sol-accent/20 rounded-2xl p-2.5 shadow-md max-w-[120px]">
            <div className="prose text-xs font-black leading-tight text-sol-text">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {formatTemplate(
                  currentQuestionBodyTemplate,
                  question?.generated_variables || {}
                )}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Right Pan placed weight item */}
        <div className="absolute bottom-16 right-[8%] sm:right-[15%] w-28 flex flex-col items-center text-center z-20">
          <div className={`border rounded-2xl p-2.5 shadow-md max-w-[120px] w-full min-h-[44px] flex items-center justify-center transition-all duration-300
            ${hoveredIdx !== null 
              ? 'bg-sol-accent/10 border-sol-accent text-sol-accent font-black scale-105' 
              : 'bg-sol-surface/40 border-sol-border/20 border-dashed text-sol-muted'
            }
          `}>
            {hoveredIdx !== null ? (
              <span className="text-xs font-black">{optionsToRender[hoveredIdx].label}</span>
            ) : (
              <Scale size={16} className="animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Solid Weight Weight Options below */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 z-10">
        {optionsToRender.map((option, index) => (
          <button
            key={`${option.label}-${index}`}
            type="button"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(option)}
            disabled={isCollapsed}
            className={`py-4 px-3 bg-sol-bg border rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 select-none
              ${hoveredIdx === index
                ? 'border-sol-accent shadow-md scale-102 bg-sol-accent/5'
                : 'border-sol-border/30 hover:border-sol-accent/50'
              }
            `}
          >
            <div className="w-7 h-7 rounded-sm bg-sol-surface border border-sol-border/20 flex items-center justify-center mb-1 text-[10px] font-black text-sol-muted">
              {index + 1}
            </div>
            <span className="text-sol-text font-black text-xs break-words max-w-full">
              {option.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
