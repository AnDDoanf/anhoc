"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChoiceOption, normalizeQuestionType } from "@/utils/questionType";
import { formatTemplate } from "@/utils/mathService";

interface BubblePopperGameProps {
  question: any;
  choiceOptions: ChoiceOption[];
  onSubmitAnswer: (value: string) => void;
  feedback: { isCorrect: boolean; show: boolean } | null;
  onSkipQuestion: () => void;
  questionIndex: number;
}

export default function BubblePopperGame({
  question,
  choiceOptions,
  onSubmitAnswer,
  feedback,
  onSkipQuestion,
  questionIndex,
}: BubblePopperGameProps) {
  const t = useTranslations("Games");
  const locale = useLocale();

  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    speed: number;
    option: ChoiceOption;
    popped: boolean;
  }>>([]);

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

  // Setup bubble positions when options or question changes (keyed by index)
  useEffect(() => {
    const spawned = optionsToRender.map((option, idx) => ({
      id: idx,
      x: 15 + idx * 23 + Math.random() * 4, // distribute horizontally across screen width
      y: 105, // start directly below the box
      speed: 1.0 + Math.random() * 1.5, // float speeds
      option,
      popped: false
    }));
    setBubbles(spawned);
  }, [questionIndex, choiceOptions]);

  // Main high-frame float physics loop
  useEffect(() => {
    if (feedback) return;

    const loop = setInterval(() => {
      setBubbles((prev) => {
        let allFinished = true;
        const next = prev.map((b) => {
          if (!b.popped && b.y > -15) {
            allFinished = false;
            return { ...b, y: b.y - b.speed * 0.4 };
          }
          return b;
        });

        // If all bubbles floated away or are popped, skip / move forward
        if (allFinished && prev.length > 0) {
          clearInterval(loop);
          onSkipQuestion();
        }

        return next;
      });
    }, 25);

    return () => clearInterval(loop);
  }, [feedback, onSkipQuestion]);

  const handlePop = (bubbleId: number, option: ChoiceOption) => {
    if (feedback) return;
    setBubbles((prev) => 
      prev.map((b) => (b.id === bubbleId ? { ...b, popped: true } : b))
    );
    onSubmitAnswer(option.value);
  };

  return (
    <div className="space-y-4 py-4 z-10 flex flex-col justify-between h-full flex-1 relative min-h-[360px]">
      
      {/* Target Question */}
      <div className="text-center space-y-2 py-2 z-10">
        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">{t("solveNow")}</p>
        <div className="prose mx-auto max-w-xl prose-p:my-0 prose-p:text-2xl prose-p:font-black prose-p:leading-tight prose-p:text-sol-text sm:prose-p:text-3xl prose-strong:text-sol-accent">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {formatTemplate(
              currentQuestionBodyTemplate,
              question?.generated_variables || {}
            )}
          </ReactMarkdown>
        </div>
      </div>

      {/* Floating Bubble Coordinate Space Box */}
      <div className="relative w-full h-72 border border-sol-border/10 rounded-3xl overflow-hidden bg-sol-bg/20 shadow-inner z-10 backdrop-blur-xs flex items-center justify-center">
        {bubbles.length === 0 && (
          <span className="text-xs font-black text-sol-muted uppercase tracking-wider animate-pulse">
            {t("loadingBubbles")}
          </span>
        )}

        {bubbles.map((b) => {
          if (b.popped || b.y < -12 || b.y > 102) return null;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handlePop(b.id, b.option)}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-sol-accent/10 border-2 border-sol-accent/30 backdrop-blur-xs flex items-center justify-center text-center p-2 text-sol-text font-black hover:bg-sol-accent/20 hover:border-sol-accent hover:scale-108 active:scale-90 transition-transform cursor-pointer shadow-lg shadow-sol-accent/5 animate-float-target"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                animationDelay: `${b.id * 0.15}s`,
                animationDuration: `${3 + b.id % 2}s`
              }}
            >
              <span className="text-xs break-words max-h-full overflow-hidden leading-tight font-black">
                {b.option.label}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
