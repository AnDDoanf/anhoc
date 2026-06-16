"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { testService } from "@/services/testService";
import { X, CheckCircle2, XCircle, Clock, Award, ChevronDown, ChevronUp, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { formatTemplate } from "@/utils/mathService";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface PracticeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string | null;
}

export default function PracticeResultModal({ isOpen, onClose, attemptId }: PracticeResultModalProps) {
  const t = useTranslations("Practice");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [exporting, setExporting] = useState(false);

  const cleanMathText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\$\$(.*?)\$\$/g, "$1")
      .replace(/\$(.*?)\$/g, "$1")
      .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "($1)/($2)")
      .replace(/\\cdot/g, "·")
      .replace(/\\times/g, "×")
      .replace(/\\le/g, "≤")
      .replace(/\\ge/g, "≥")
      .replace(/\\ne/g, "≠")
      .replace(/\\pi/g, "π")
      .replace(/\\infty/g, "∞")
      .replace(/\\theta/g, "θ")
      .replace(/\\alpha/g, "α")
      .replace(/\\beta/g, "β")
      .replace(/\\sqrt\{(.*?)\}/g, "√($1)")
      .replace(/\\pm/g, "±");
  };

  const handleExportPDF = async () => {
    if (!attempt) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Load Roboto-Regular.ttf from local assets to support Vietnamese characters
      try {
        const fontUrl = window.location.origin + "/Roboto-Regular.ttf";
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("Failed to fetch font");
        const fontBuffer = await response.arrayBuffer();
        
        // Convert array buffer to base64
        const bytes = new Uint8Array(fontBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Font = btoa(binary);
        
        doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (err) {
        console.warn("Could not load Unicode font. Falling back to standard Helvetica.", err);
        doc.setFont("helvetica");
      }

      // Title & Header info
      const title = attempt.lesson 
        ? (locale === "vi" ? attempt.lesson.title_vi : attempt.lesson.title_en) 
        : t("practiceResult");

      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text("ANHOC LEARNING PLATFORM", 20, 20);
      
      doc.setFontSize(14);
      doc.text(title, 20, 30);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const scoreStr = t("pdfScore", { score: attempt.total_score || 0 });
      const dateStr = attempt.completed_at 
        ? t("pdfDate", { date: format(new Date(attempt.completed_at), locale === "vi" ? "d MMM, yyyy HH:mm" : "MMM d, yyyy HH:mm", { locale: locale === "vi" ? vi : enUS }) })
        : "";
      doc.text(`${scoreStr}   |   ${dateStr}`, 20, 38);

      // Draw horizontal separator
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 42, 190, 42);

      let y = 50;
      const margin = 20;
      const pageHeight = doc.internal.pageSize.getHeight();

      const checkPageOverflow = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin; // reset Y for new page
        }
      };

      attempt.snapshots.forEach((snapshot: any, index: number) => {
        const textVi = snapshot.template?.body_template_vi ? formatTemplate(snapshot.template.body_template_vi, snapshot.generated_variables) : "";
        const textEn = snapshot.template?.body_template_en ? formatTemplate(snapshot.template.body_template_en, snapshot.generated_variables) : "";
        const primaryText = cleanMathText(locale === "vi" ? textVi : textEn);
        const explanationText = snapshot.template?.explanation_template_vi 
          ? cleanMathText(locale === "vi" ? snapshot.template.explanation_template_vi : (snapshot.template.explanation_template_en || snapshot.template.explanation_template_vi))
          : "";

        const rightAnswers = snapshot.right_answers || [];
        const studentAnswer = snapshot.student_answer || t("skipped");
        const isCorrect = snapshot.is_correct;

        // Estimate block height
        // Line wrapping for text
        const splitText = doc.splitTextToSize(`${index + 1}. ${primaryText}`, 170);
        const textHeight = splitText.length * 5;
        let blockHeight = textHeight + 25; // padding for answers and explanation
        if (explanationText) {
          const splitExplanation = doc.splitTextToSize(`${t("explanation")}: ${explanationText}`, 170);
          blockHeight += splitExplanation.length * 4.5 + 4;
        }

        checkPageOverflow(blockHeight + 10);

        // Draw Question Number & Body
        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        doc.text(splitText, margin, y);
        y += textHeight + 4;

        // Draw Student Answer
        doc.setFontSize(10);
        doc.setTextColor(isCorrect ? 34 : 197, isCorrect ? 139 : 34, isCorrect ? 34 : 31); // green vs red
        const ansLabel = `${t("yourAnswerLabel")}: `;
        const correctnessLabel = isCorrect ? t("pdfCorrect") : t("pdfIncorrect");
        doc.text(`${ansLabel}${studentAnswer}${correctnessLabel}`, margin + 5, y);
        y += 6;

        // Draw Right Answers
        doc.setTextColor(16, 117, 107); // Sol accent color
        const rightAnsLabel = t("pdfRightAnswerLabel");
        doc.text(`${rightAnsLabel}${rightAnswers.join(", ")}`, margin + 5, y);
        y += 6;

        // Draw Explanation
        if (explanationText) {
          doc.setFontSize(9);
          doc.setTextColor(110, 110, 110);
          const expLabel = `${t("explanation")}: `;
          const splitExp = doc.splitTextToSize(`${expLabel}${explanationText}`, 165);
          doc.text(splitExp, margin + 5, y);
          y += (splitExp.length * 4.5) + 4;
        }

        // Space between items
        y += 8;
      });

      doc.save(`anhoc-practice-report-${attempt.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (isOpen && attemptId) {
      fetchAttempt(attemptId);
    } else {
      setAttempt(null);
      setExpandedIndex(0);
    }
  }, [isOpen, attemptId]);

  const fetchAttempt = async (id: string) => {
    setLoading(true);
    try {
      const data = await testService.getAttempt(id);
      setAttempt(data);
    } catch (error) {
      console.error("Failed to fetch attempt details:", error);
    } finally {
      setLoading(false);
    }
  };

  const dateLocale = locale === "vi" ? vi : enUS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-sol-bg/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-sol-surface border border-sol-border/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <header className="p-8 border-b border-sol-border/10 flex items-center justify-between bg-sol-surface/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-sol-accent text-sol-bg flex items-center justify-center shadow-lg shadow-sol-accent/20">
              <Award size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-sol-text tracking-tight uppercase">
                {attempt?.lesson ? (locale === "vi" ? attempt.lesson.title_vi : attempt.lesson.title_en) : t("practiceResult")}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-sol-muted font-bold">
                  <Clock size={14} className="text-sol-accent" />
                  <span>{attempt?.completed_at ? format(new Date(attempt.completed_at), locale === "vi" ? "d MMM, yyyy HH:mm" : "MMM d, yyyy HH:mm", { locale: dateLocale }) : "..."}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-sol-accent bg-sol-accent/5 px-2 py-0.5 rounded-full border border-sol-accent/10">
                   {t("scoreLabel", { score: attempt?.total_score || 0 })}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-sol-border/10 text-sol-muted hover:text-sol-text transition-all"
          >
            <X size={24} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-sol-bg/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sol-muted font-bold animate-pulse">{t("analyzingResults")}</p>
            </div>
          ) : (
            attempt?.snapshots?.map((snapshot: any, idx: number) => {
              const textVi = snapshot.template?.body_template_vi ? formatTemplate(snapshot.template.body_template_vi, snapshot.generated_variables) : "";
              const textEn = snapshot.template?.body_template_en ? formatTemplate(snapshot.template.body_template_en, snapshot.generated_variables) : "";
              const primaryText = locale === "vi" ? textVi : textEn;
              
              const isCorrect = snapshot.is_correct;
              const isExpanded = expandedIndex === idx;

              // Use persisted right answers
              const rightAnswers = snapshot.right_answers || [];

              return (
                <div 
                  key={snapshot.id}
                  className={`group bg-sol-surface rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-sol-accent/30 shadow-md' : 'border-sol-border/10 hover:border-sol-accent/20'}`}
                >
                  {/* Collapsible Header */}
                  <button 
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-grow prose prose-sm dark:prose-invert line-clamp-1 text-sol-text font-bold">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                           {primaryText}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isCorrect ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <XCircle size={20} className="text-red-500" />
                      )}
                      {isExpanded ? <ChevronUp size={20} className="text-sol-muted" /> : <ChevronDown size={20} className="text-sol-muted" />}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-sol-border/5 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="prose prose-lg dark:prose-invert max-w-none text-sol-text font-bold leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                           {primaryText}
                        </ReactMarkdown>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-sol-border/5">
                        <div className={`p-4 rounded-2xl border ${isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                           <label className="text-[10px] uppercase font-black text-sol-muted tracking-widest mb-1 block">{t("yourAnswerLabel")}</label>
                           <p className={`text-xl font-mono font-black ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                             {snapshot.student_answer || t("skipped")}
                           </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-sol-accent/5 border border-sol-accent/10">
                           <label className="text-[10px] uppercase font-black text-sol-muted tracking-widest mb-1 block">{t("correctAnswers")}</label>
                           <div className="flex flex-wrap gap-2">
                             {rightAnswers.length > 0 ? (
                               rightAnswers.map((ans: string, i: number) => (
                                 <span key={i} className="text-xl font-mono font-black text-sol-accent">
                                   {ans}{i < rightAnswers.length - 1 ? "," : ""}
                                 </span>
                               ))
                             ) : (
                               <span className="text-xl font-mono font-black text-sol-accent">?</span>
                             )}
                           </div>
                        </div>
                      </div>

                      {snapshot.template?.explanation_template_vi && (
                        <div className="p-4 rounded-2xl bg-sol-surface border border-sol-border/10">
                          <label className="text-[10px] uppercase font-black text-sol-muted tracking-widest mb-2 block">{t("explanation")}</label>
                          <div className="prose prose-sm dark:prose-invert prose-p:text-sol-muted leading-relaxed">
                             <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                               {locale === "vi" ? snapshot.template.explanation_template_vi : snapshot.template.explanation_template_en || snapshot.template.explanation_template_vi}
                             </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-sol-border/10 flex justify-end gap-4 bg-sol-surface/50">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-8 py-3 border border-sol-accent/20 hover:border-sol-accent/40 text-sol-accent rounded-2xl font-bold hover:bg-sol-accent/5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-sol-accent border-t-transparent rounded-full animate-spin" />
                <span>{t("exporting")}</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>{t("exportPDF")}</span>
              </>
            )}
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-sol-accent text-sol-bg rounded-2xl font-bold hover:bg-sol-accent/90 transition-all shadow-md active:scale-95"
          >
            {t("closeReview")}
          </button>
        </footer>
      </div>
    </div>
  );
}
