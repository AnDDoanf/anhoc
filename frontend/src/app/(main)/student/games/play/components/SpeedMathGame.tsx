"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronRight } from "lucide-react";
import { ChoiceOption, getOrderingItems, makeOrderingAnswer, normalizeQuestionType } from "@/utils/questionType";
import { formatTemplate } from "@/utils/mathService";

interface SpeedMathGameProps {
  question: any;
  questionIndex: number;
  choiceOptions: ChoiceOption[];
  onSubmitAnswer: (value: string) => void;
  feedback: { isCorrect: boolean; show: boolean } | null;
}

export default function SpeedMathGame({
  question,
  questionIndex,
  choiceOptions,
  onSubmitAnswer,
  feedback: _feedback,
}: SpeedMathGameProps) {
  const t = useTranslations("Games");
  const locale = useLocale();
  void _feedback;

  const [answerInput, setAnswerInput] = useState("");
  const [orderedItems, setOrderedItems] = useState<ChoiceOption[]>([]);

  // Clear states when question index changes
  useEffect(() => {
    setAnswerInput("");
    setOrderedItems([]);
  }, [questionIndex, question?.id]);

  const questionType = normalizeQuestionType(question?.template_type);
  const currentQuestionBodyTemplate =
    locale === "vi"
      ? question?.body_template_vi || question?.body_template_en || ""
      : question?.body_template_en || question?.body_template_vi || "";

  const orderingItems = useMemo(() => {
    if (!question) return [];
    return getOrderingItems(question, question.generated_variables, locale);
  }, [question, locale]);

  const availableOrderingItems = orderingItems.filter(
    (item) => !orderedItems.some((ordered) => ordered.value === item.value)
  );

  const trueFalseOptions = [
    { label: t("trueOption"), value: "true" },
    { label: t("falseOption"), value: "false" },
  ];

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim()) return;
    onSubmitAnswer(answerInput);
  };

  const handleSelectOrdering = (item: ChoiceOption) => {
    setOrderedItems((prev) => [...prev, item]);
  };

  const handleRemoveOrdering = (item: ChoiceOption) => {
    setOrderedItems((prev) => prev.filter((ordered) => ordered.value !== item.value));
  };

  return (
    <div className="space-y-8 py-4 z-10 flex flex-col justify-between h-full flex-1">
      {/* Question Presentation */}
      <div key={questionIndex} className="text-center space-y-3 py-6 animate-slide-in">
        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">
          {t("solveNow")}
        </p>
        <div className="prose mx-auto max-w-xl prose-p:my-0 prose-p:text-3xl prose-p:font-black prose-p:leading-tight prose-p:text-sol-text sm:prose-p:text-4xl prose-strong:text-sol-accent">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {formatTemplate(
              currentQuestionBodyTemplate,
              question?.generated_variables || {}
            )}
          </ReactMarkdown>
        </div>
      </div>

      {/* User Input Form */}
      <div className="max-w-md mx-auto w-full">
        {questionType === "true_false" && (
          <div className="grid grid-cols-2 gap-3">
            {trueFalseOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSubmitAnswer(option.value)}
                className="px-6 py-4 bg-sol-bg border border-sol-border/20 rounded-2xl text-sol-text font-black hover:border-sol-accent hover:text-sol-accent transition-all"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {(questionType === "multiple_choices" || questionType === "theoretical_question") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choiceOptions.map((option, index) => (
              <button
                key={`${option.label}-${option.value}-${index}`}
                type="button"
                onClick={() => onSubmitAnswer(option.value)}
                className="px-6 py-4 bg-sol-bg border border-sol-border/20 rounded-2xl text-left text-sol-text font-bold hover:border-sol-accent hover:text-sol-accent transition-all"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {questionType === "ordering" && (
          <div className="space-y-4">
            <div className="min-h-16 p-4 bg-sol-bg border border-sol-border/20 rounded-2xl flex flex-wrap gap-2">
              {orderedItems.length === 0 ? (
                <span className="text-sol-muted text-sm">{t("selectItemsInOrder")}</span>
              ) : orderedItems.map((item) => (
                <button
                  key={`ordered-${item.value}`}
                  type="button"
                  onClick={() => handleRemoveOrdering(item)}
                  className="px-3 py-2 rounded-xl bg-sol-surface border border-sol-border/20 text-sol-text font-bold"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableOrderingItems.map((item) => (
                <button
                  key={`available-${item.value}`}
                  type="button"
                  onClick={() => handleSelectOrdering(item)}
                  className="px-4 py-2 bg-sol-bg border border-sol-border/20 rounded-xl text-sol-text font-bold hover:border-sol-accent hover:text-sol-accent transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={orderedItems.length === 0 || availableOrderingItems.length > 0}
              onClick={() => onSubmitAnswer(makeOrderingAnswer(orderedItems))}
              className="w-full px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-black disabled:opacity-50"
            >
              {t("check")}
            </button>
          </div>
        )}

        {questionType === "numeric_input" && (
          <form onSubmit={handleSubmit} className="w-full flex items-center gap-3">
            <input
              type="text"
              pattern="[0-9.-]*"
              inputMode="decimal"
              autoFocus
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder={t("numericAnswerPlaceholder")}
              className="flex-1 bg-sol-bg border border-sol-border/30 rounded-2xl p-4 text-center text-lg font-black text-sol-text focus:outline-none focus:border-sol-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!answerInput.trim()}
              className="px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-black uppercase text-sm tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-1 shadow-lg shadow-sol-accent/10"
            >
              {t("check")}
              <ChevronRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
