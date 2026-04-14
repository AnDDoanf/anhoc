"use client";

import {
  checkAnswer,
  evaluateFormula,
  formatTemplate,
  generateVars,
} from "@/utils/mathService";
import {
  ChoiceOption,
  getChoiceOptions,
  getOrderingItems,
  makeOrderingAnswer,
  normalizeQuestionType,
} from "@/utils/questionType";
import "katex/dist/katex.min.css";
import { CheckCircle2, RefreshCw, Send, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

interface QuestionPlayerProps {
  template: any;
}

export default function QuestionPlayer({ template }: QuestionPlayerProps) {
  const t = useTranslations("Questions.player");
  const locale = useLocale();

  const [vars, setVars] = useState<Record<string, number>>({});
  const [currentTextEn, setCurrentTextEn] = useState("");
  const [currentTextVi, setCurrentTextVi] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [revealAnswer, setRevealAnswer] = useState<number | boolean | null>(null);
  const [allExpectedAnswers, setAllExpectedAnswers] = useState<{ formula: string; value: number | boolean | null }[]>([]);
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOption[]>([]);
  const [availableOrderingItems, setAvailableOrderingItems] = useState<ChoiceOption[]>([]);
  const [orderedItems, setOrderedItems] = useState<ChoiceOption[]>([]);

  const questionType = normalizeQuestionType(template?.template_type);

  const getAcceptedFormulas = (): string[] => {
    return (template.accepted_formulas || []).slice(1);
  };

  const generateSnapshot = () => {
    const generated = generateVars(template.logic_config);
    setVars(generated);
    setCurrentTextEn(formatTemplate(template.body_template_en, generated));
    setCurrentTextVi(formatTemplate(template.body_template_vi, generated));

    const primaryFormula = template.accepted_formulas?.[0] || "";
    const correct = evaluateFormula(primaryFormula, generated);
    const allFormulas = (template.accepted_formulas || []).filter((f: string) => f.trim());

    setRevealAnswer(correct);
    setAllExpectedAnswers(
      allFormulas.map((f: string) => ({ formula: f, value: evaluateFormula(f, generated) }))
    );
    setChoiceOptions(getChoiceOptions(template, generated, locale));
    setAvailableOrderingItems(getOrderingItems(template, generated, locale));
    setOrderedItems([]);
    setAnswerInput("");
    setStatus("idle");
  };

  useEffect(() => {
    if (template) generateSnapshot();
  }, [template]);

  const handleSubmitAnswer = (answer: string) => {
    if (!answer) return;
    const primaryFormula = template.accepted_formulas?.[0] || "";
    const isCorrect = checkAnswer(primaryFormula, vars, answer, getAcceptedFormulas());
    setAnswerInput(answer);
    setStatus(isCorrect ? "correct" : "incorrect");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitAnswer(answerInput);
  };

  const selectOrderingItem = (item: ChoiceOption) => {
    setAvailableOrderingItems(prev => prev.filter((candidate) => candidate.value !== item.value));
    setOrderedItems(prev => [...prev, item]);
    setStatus("idle");
  };

  const removeOrderingItem = (item: ChoiceOption) => {
    setOrderedItems(prev => prev.filter((candidate) => candidate.value !== item.value));
    setAvailableOrderingItems(prev => [...prev, item]);
    setStatus("idle");
  };

  if (!template) return null;

  const primaryText = locale === "vi" ? currentTextVi : currentTextEn;
  const secondaryText = locale === "vi" ? currentTextEn : currentTextVi;
  const trueFalseOptions = [
    { label: t("true"), value: "true" },
    { label: t("false"), value: "false" },
  ];

  return (
    <div className="bg-sol-surface border border-sol-border/10 rounded-3xl p-8 relative overflow-hidden flex flex-col gap-8 shadow-sm">
      <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500
        ${status === "correct" ? "bg-green-500" : status === "incorrect" ? "bg-red-500" : "bg-sol-accent"}`}
      />

      <div className="flex justify-between items-start">
        <h4 className="text-xs font-black uppercase tracking-widest text-sol-muted flex items-center gap-2">
          {t("liveSnapshot")}
          {getAcceptedFormulas().length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sol-accent/10 text-sol-accent text-[10px] border border-sol-accent/20 normal-case tracking-normal font-bold">
              +{getAcceptedFormulas().length} {t("acceptedBadge")}
            </span>
          )}
        </h4>
        <button
          onClick={generateSnapshot}
          className="flex items-center gap-2 text-xs font-bold text-sol-accent hover:text-sol-accent/80 hover:bg-sol-accent/10 px-3 py-1.5 rounded-xl transition-all border border-sol-accent/10"
        >
          <RefreshCw size={14} /> {t("reroll")}
        </button>
      </div>

      <div className="space-y-4">
        <div className="prose dark:prose-invert max-w-none prose-p:text-sol-text prose-strong:text-sol-accent text-lg leading-relaxed font-bold">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {primaryText}
          </ReactMarkdown>
        </div>
        <div className="prose dark:prose-invert max-w-none prose-p:text-sol-muted/80 text-sm leading-relaxed italic">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {secondaryText}
          </ReactMarkdown>
        </div>
      </div>

      {questionType === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {trueFalseOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSubmitAnswer(option.value)}
              className="px-6 py-4 bg-sol-bg border border-sol-border/20 rounded-2xl text-sol-text font-black hover:border-sol-accent hover:text-sol-accent transition-all"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {questionType === "multiple_choices" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choiceOptions.map((option, index) => (
            <button
              key={`${option.label}-${option.value}-${index}`}
              type="button"
              onClick={() => handleSubmitAnswer(option.value)}
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
              <span className="text-sol-muted text-sm">{t("chooseItemsInOrder")}</span>
            ) : orderedItems.map((item) => (
              <button
                key={`ordered-${item.value}`}
                type="button"
                onClick={() => removeOrderingItem(item)}
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
                onClick={() => selectOrderingItem(item)}
                className="px-4 py-2 bg-sol-bg border border-sol-border/20 rounded-xl text-sol-text font-bold hover:border-sol-accent hover:text-sol-accent transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={orderedItems.length === 0 || availableOrderingItems.length > 0}
            onClick={() => handleSubmitAnswer(makeOrderingAnswer(orderedItems))}
            className="w-full px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-black disabled:opacity-50"
          >
            {t("checkOrder")}
          </button>
        </div>
      )}

      {questionType === "numeric_input" && (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="relative flex items-center">
            <input
              type="number"
              step="any"
              value={answerInput}
              onChange={(e) => {
                setAnswerInput(e.target.value);
                setStatus("idle");
              }}
              placeholder={t("placeholder")}
              className={`w-full bg-sol-bg border-2 rounded-2xl px-6 py-4 text-sol-text placeholder-sol-muted/40 outline-none transition-all font-mono font-bold text-lg
                ${status === "correct" ? "border-green-500/50 focus:border-green-500" : ""}
                ${status === "incorrect" ? "border-red-500/50 focus:border-red-500" : ""}
                ${status === "idle" ? "border-sol-border/20 focus:border-sol-accent/50" : ""}
              `}
            />
            <button
              type="submit"
              className="absolute right-2 p-3 bg-sol-surface rounded-xl text-sol-accent hover:bg-sol-accent hover:text-sol-bg transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      )}

      {status === "correct" && (
        <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CheckCircle2 size={20} /> {t("correct")}
        </div>
      )}
      {status === "incorrect" && (
        <div className="flex items-center gap-2 text-red-500/90 font-bold bg-red-500/10 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <XCircle size={20} /> {t("incorrect")}
        </div>
      )}

      <div className="border-t border-sol-border/10 pt-4 mt-2">
        <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest block mb-2">{t("varTree")}</span>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(vars).map(([k, v]) => (
              <div key={k} className="px-3 py-1 bg-sol-bg border border-sol-border/10 rounded-lg text-xs font-mono">
                <span className="text-sol-muted">{k}:</span> <span className="text-sol-text font-bold">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest">{t("expected")}</span>
            {allExpectedAnswers.length > 0 ? (
              allExpectedAnswers.map(({ formula, value }, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-sol-bg border border-sol-border/10 rounded-lg text-xs font-mono">
                  <span className="text-sol-muted shrink-0">{idx === 0 ? "*" : `+${idx}`}</span>
                  <span className="text-sol-muted/60 truncate max-w-[140px]" title={formula}>{formula}</span>
                  <span className="ml-auto text-sol-accent font-bold bg-sol-surface px-2 py-0.5 rounded-md border border-sol-border/5">
                    {value !== null ? String(value) : "ERROR"}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-sol-bg border border-sol-border/10 rounded-lg text-xs font-mono">
                <span className="text-sol-muted">{t("expected")}:</span>
                <span className="text-sol-accent font-bold">{revealAnswer !== null ? String(revealAnswer) : "ERROR"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
