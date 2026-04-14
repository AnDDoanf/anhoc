"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Save, Database, Code2, Plus, Trash2 } from "lucide-react";
import { testService, CreateTemplateDTO } from "@/services/testService";
import { lessonService } from "@/services/lessonService";

interface VariableDef {
  name: string;
  min: number | string;
  max: number | string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTemplateId?: string | null;
}

const DEFAULT_VARS: VariableDef[] = [
  { name: "x", min: 1, max: 10 },
  { name: "y", min: 1, max: 10 },
];

const QUESTION_TYPES = ["numeric_input", "true_false", "multiple_choices", "ordering"];

const DIFFICULTIES = ["easy", "medium", "hard"];

const toFiniteNumber = (value: number | string | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const TYPE_PRESETS: Record<string, {
  bodyEn: string;
  bodyVi: string;
  formulas: string[];
  logic: Record<string, unknown>;
  vars: VariableDef[];
}> = {
  numeric_input: {
    bodyEn: "Calculate {{x}} + {{y}}",
    bodyVi: "Tính {{x}} + {{y}}",
    formulas: ["x + y"],
    vars: DEFAULT_VARS,
    logic: {
      variables: {
        x: { min: 1, max: 10 },
        y: { min: 1, max: 10 },
      },
    },
  },
  true_false: {
    bodyEn: "True or false: {{x}} is greater than {{y}}.",
    bodyVi: "Đúng hay sai: {{x}} lớn hơn {{y}}.",
    formulas: ["x > y"],
    vars: DEFAULT_VARS,
    logic: {
      variables: {
        x: { min: 1, max: 20 },
        y: { min: 1, max: 20 },
      },
      constraints: ["x != y"],
    },
  },
  multiple_choices: {
    bodyEn: "Choose the value of {{x}} + {{y}}.",
    bodyVi: "Chọn giá trị của {{x}} + {{y}}.",
    formulas: ["x + y"],
    vars: DEFAULT_VARS,
    logic: {
      variables: {
        x: { min: 1, max: 10 },
        y: { min: 1, max: 10 },
      },
      choices: [
        { formula: "x + y" },
        { formula: "x + y - 1" },
        { formula: "x + y + 1" },
        { formula: "x" },
      ],
    },
  },
  ordering: {
    bodyEn: "Order these numbers from smallest to largest.",
    bodyVi: "Sắp xếp các số sau từ bé đến lớn.",
    formulas: ["[a,b,c]"],
    vars: [
      { name: "a", min: 1, max: 10 },
      { name: "b", min: 11, max: 20 },
      { name: "c", min: 21, max: 30 },
    ],
    logic: {
      variables: {
        a: { min: 1, max: 10 },
        b: { min: 11, max: 20 },
        c: { min: 21, max: 30 },
      },
      items: [
        { label_en: "{{a}}", label_vi: "{{a}}", value: "{{a}}" },
        { label_en: "{{b}}", label_vi: "{{b}}", value: "{{b}}" },
        { label_en: "{{c}}", label_vi: "{{c}}", value: "{{c}}" },
      ],
    },
  },
};

export default function CreateTemplateModal({ isOpen, onClose, onSuccess, editTemplateId }: Props) {
  const t = useTranslations("Questions.modal");
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);

  // Simple fields
  const [lessonId, setLessonId] = useState("");
  const [templateType, setTemplateType] = useState("numeric_input");
  const [difficulty, setDifficulty] = useState("medium");
  const [bodyEn, setBodyEn] = useState("Calculate $x$ + $y$");
  const [bodyVi, setBodyVi] = useState("Tính $x$ + $y$");

  // Multiple accepted answer formulas (first = primary)
  const [acceptedFormulas, setAcceptedFormulas] = useState<string[]>(["x + y"]);

  // Logic builder state
  const [variableDefs, setVariableDefs] = useState<VariableDef[]>(DEFAULT_VARS);
  const [logicJson, setLogicJson] = useState("");
  const [logicJsonDirty, setLogicJsonDirty] = useState(false);

  const buildLogicFromDefs = () => {
    const variables: Record<string, { min: number; max: number }> = {};
    for (const v of variableDefs) {
      const key = v.name.trim();
      if (key) variables[key] = {
        min: toFiniteNumber(v.min),
        max: toFiniteNumber(v.max),
      };
    }
    return { variables };
  };

  const buildLogicConfig = () => {
    try {
      const parsed = JSON.parse(logicJson);
      return parsed && typeof parsed === "object" ? parsed : buildLogicFromDefs();
    } catch {
      return buildLogicFromDefs();
    }
  };

  const parseLogicConfig = (raw: any, primaryFormula: string, extraAccepted: string[]) => {
    setAcceptedFormulas(
      [primaryFormula, ...extraAccepted].filter(f => f.trim())
        .length > 0
        ? [primaryFormula, ...extraAccepted].filter(f => f.trim())
        : [primaryFormula]
    );
    try {
      const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
      setLogicJson(JSON.stringify(cfg || buildLogicFromDefs(), null, 2));
      setLogicJsonDirty(true);
      if (cfg?.variables) {
        const defs = Object.entries(cfg.variables).map(([name, range]: [string, any]) => ({
          name,
          min: range.min ?? 1,
          max: range.max ?? 10,
        }));
        setVariableDefs(defs.length > 0 ? defs : DEFAULT_VARS);
      }
    } catch {
      setVariableDefs(DEFAULT_VARS);
      setLogicJson(JSON.stringify({ variables: { x: { min: 1, max: 10 }, y: { min: 1, max: 10 } } }, null, 2));
      setLogicJsonDirty(false);
    }
  };

  useEffect(() => {
    if (!logicJsonDirty) {
      setLogicJson(JSON.stringify(buildLogicFromDefs(), null, 2));
    }
  }, [variableDefs, logicJsonDirty]);

  const syncVariablesToLogicJson = (defs: VariableDef[]) => {
    const variableNames = defs
      .map((v) => String(v.name || "").trim())
      .filter(Boolean);

    if (templateType === "ordering") {
      setAcceptedFormulas([`[${variableNames.join(",")}]`]);
    }

    setLogicJson(prev => {
      let parsed: Record<string, any> = {};
      try {
        parsed = prev ? JSON.parse(prev) : {};
      } catch {
        parsed = {};
      }

      const variables: Record<string, { min: number; max: number }> = {};
      for (const v of defs) {
        const key = String(v.name || "").trim();
        const currentRange = parsed.variables?.[key];
        if (key) variables[key] = {
          min: toFiniteNumber(v.min, toFiniteNumber(currentRange?.min)),
          max: toFiniteNumber(v.max, toFiniteNumber(currentRange?.max)),
        };
      }

      const nextConfig = { ...parsed, variables };

      if (templateType === "ordering") {
        nextConfig.items = variableNames
          .map((name) => ({
            label_en: `{{${name}}}`,
            label_vi: `{{${name}}}`,
            value: `{{${name}}}`,
          }));

        nextConfig.derived = undefined;
        nextConfig.choices = undefined;
      }

      return JSON.stringify(nextConfig, null, 2);
    });
    setLogicJsonDirty(true);
  };

  // ---- Data fetching ----
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const lList = await lessonService.list();
        setLessons(lList);

        if (editTemplateId) {
          const allTpl = await testService.listTemplates();
          const curr = allTpl.find((t: any) => t.id === editTemplateId);
          if (curr) {
            setLessonId(curr.lesson_id || "");
            setTemplateType(curr.template_type);
            setDifficulty(curr.difficulty || "medium");
            setBodyEn(curr.body_template_en);
            setBodyVi(curr.body_template_vi);
            parseLogicConfig(curr.logic_config, curr.accepted_formulas?.[0] || "", curr.accepted_formulas?.slice(1) || []);
          }
        } else {
          // Reset to defaults
          const preset = TYPE_PRESETS.numeric_input;
          setLessonId("");
          setTemplateType("numeric_input");
          setDifficulty("medium");
          setBodyEn(preset.bodyEn);
          setBodyVi(preset.bodyVi);
          setAcceptedFormulas(preset.formulas);
          setVariableDefs(preset.vars);
          setLogicJson(JSON.stringify(preset.logic, null, 2));
          setLogicJsonDirty(false);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };
    fetchData();
  }, [isOpen, editTemplateId]);

  if (!isOpen) return null;

  // ---- Variable management ----
  const handleVarChange = (idx: number, field: keyof VariableDef, value: string | number) => {
    setVariableDefs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      syncVariablesToLogicJson(next);
      return next;
    });
  };

  const addVariable = () => {
    const letters = "xyzabcdefghijklmnopqrstuvw";
    const nextName = letters[variableDefs.length] || `v${variableDefs.length}`;
    setVariableDefs(prev => {
      const next = [...prev, { name: nextName, min: 1, max: 10 }];
      syncVariablesToLogicJson(next);
      return next;
    });
  };

  const removeVariable = (idx: number) => {
    if (variableDefs.length <= 1) return;
    setVariableDefs(prev => {
      const next = prev.filter((_, i) => i !== idx);
      syncVariablesToLogicJson(next);
      return next;
    });
  };

  const handleTypeChange = (nextType: string) => {
    setTemplateType(nextType);
    const preset = TYPE_PRESETS[nextType];
    if (!preset || editTemplateId) return;

    setBodyEn(preset.bodyEn);
    setBodyVi(preset.bodyVi);
    setAcceptedFormulas(preset.formulas);
    setVariableDefs(preset.vars);
    setLogicJson(JSON.stringify(preset.logic, null, 2));
    setLogicJsonDirty(true);
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      try {
        JSON.parse(logicJson);
      } catch {
        alert(t("invalidLogicJson"));
        setLoading(false);
        return;
      }

      const payload: CreateTemplateDTO = {
        lesson_id: lessonId === "" ? undefined : lessonId,
        template_type: templateType,
        difficulty,
        body_template_en: bodyEn,
        body_template_vi: bodyVi,
        // accepted_formulas[0] is the primary formula; the rest are alternatives
        accepted_formulas: acceptedFormulas.filter(f => f.trim()),
        logic_config: buildLogicConfig(),
      };

      if (editTemplateId) {
        await testService.updateTemplate(editTemplateId, payload);
      } else {
        await testService.createTemplate(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save template:", err);
      const message = (err as any)?.response?.data?.details
        || (err as any)?.response?.data?.error
        || t("saveError");
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sol-bg/80 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-sol-surface border border-sol-border/20 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <header className="p-6 border-b border-sol-border/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-sol-text">
                {editTemplateId ? t("editTitle") : t("createTitle")}
              </h2>
              <p className="text-xs text-sol-muted font-medium uppercase tracking-widest">{t("adminTool")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sol-accent/10 text-sol-muted hover:text-sol-accent rounded-full transition-colors">
            <X size={24} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="template-form" onSubmit={handleSubmit} className="space-y-8">

            {/* Row 1: Lesson + Type + Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1">{t("associateLesson")}</label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                >
                  <option value="">{t("noLesson")}</option>
                  {lessons.map(l => {
                    const gradeLabel = l.grade
                      ? (locale === "vi" ? l.grade.title_vi : l.grade.title_en) || l.grade.slug
                      : t("unassignedGrade");
                    const lessonTitle = locale === "vi" ? l.title_vi : l.title_en;
                    return (
                      <option key={l.id} value={l.id}>[{gradeLabel}] {lessonTitle}</option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1">{t("templateType")}</label>
                <select
                  required
                  value={templateType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>{t(`questionTypes.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1">{t("difficulty")}</label>
                <select
                  required
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                >
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>{t(`difficultyOptions.${item}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Body text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1">{t("bodyEn")}</label>
                <textarea required
                  value={bodyEn}
                  onChange={(e) => setBodyEn(e.target.value)}
                  rows={3}
                  className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl p-4 text-sol-text resize-none focus:ring-2 focus:ring-sol-accent/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1">{t("bodyVi")}</label>
                <textarea required
                  value={bodyVi}
                  onChange={(e) => setBodyVi(e.target.value)}
                  rows={3}
                  className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl p-4 text-sol-text resize-none focus:ring-2 focus:ring-sol-accent/30"
                />
              </div>
            </div>

            {/* Row 3: Answer Formula + Number of Choices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-sol-muted pl-1 flex items-center gap-2">
                  <Code2 size={14} /> {t("acceptedFormulas")}
                </label>
                <div className="space-y-2">
                  {acceptedFormulas.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-sol-muted w-6 shrink-0">{idx === 0 ? "★" : `+${idx}`}</span>
                      <input
                        required={idx === 0}
                        type="text"
                        value={f}
                        onChange={(e) => setAcceptedFormulas(prev => {
                          const next = [...prev];
                          next[idx] = e.target.value;
                          return next;
                        })}
                        placeholder={idx === 0 ? t("formulaPlaceholder") : t("altFormulaPlaceholder")}
                        className="flex-1 bg-sol-bg border border-sol-border/20 rounded-xl px-4 py-2.5 font-mono text-sm text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setAcceptedFormulas(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-sol-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAcceptedFormulas(prev => [...prev, ""])}
                    className="flex items-center gap-1.5 text-xs font-bold text-sol-accent hover:bg-sol-accent/10 px-3 py-1.5 rounded-xl transition-all border border-sol-accent/20 mt-1"
                  >
                    <Plus size={13} /> {t("addFormula")}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Variable Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-sol-muted flex items-center gap-2">
                  <Code2 size={14} /> {t("variables")} ({variableDefs.length})
                </label>
                <button
                  type="button"
                  onClick={addVariable}
                  className="flex items-center gap-1.5 text-xs font-bold text-sol-accent hover:bg-sol-accent/10 px-3 py-1.5 rounded-xl transition-all border border-sol-accent/20"
                >
                  <Plus size={14} /> {t("addVariable")}
                </button>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1">
                <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest">{t("varName")}</span>
                <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest">{t("varMin")}</span>
                <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest">{t("varMax")}</span>
                <span />
              </div>

              <div className="space-y-3">
                {variableDefs.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center bg-sol-bg rounded-2xl p-4 border border-sol-border/10">
                    <input
                      type="text"
                      required
                      value={v.name}
                      onChange={(e) => handleVarChange(idx, "name", e.target.value)}
                      placeholder="x"
                      className="bg-transparent border border-sol-border/20 rounded-xl px-4 py-2 font-mono text-sm font-bold text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                    />
                    <input
                      type="number"
                      required
                      step="any"
                      value={v.min}
                      onChange={(e) => handleVarChange(idx, "min", e.target.value)}
                      className="bg-transparent border border-sol-border/20 rounded-xl px-4 py-2 text-sm text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                    />
                    <input
                      type="number"
                      required
                      step="any"
                      value={v.max}
                      onChange={(e) => handleVarChange(idx, "max", e.target.value)}
                      className="bg-transparent border border-sol-border/20 rounded-xl px-4 py-2 text-sm text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariable(idx)}
                      disabled={variableDefs.length <= 1}
                      className="p-2 text-sol-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live JSON preview */}
              <div className="rounded-2xl bg-sol-bg border border-sol-border/10 p-4">
                <span className="text-[10px] font-black uppercase text-sol-muted tracking-widest block mb-2">{t("generatedJson")}</span>
                <textarea
                  value={logicJson}
                  onChange={(e) => {
                    setLogicJson(e.target.value);
                    setLogicJsonDirty(true);
                  }}
                  rows={12}
                  className="scrollbar-hidden w-full bg-transparent text-xs font-mono text-sol-accent/80 overflow-auto whitespace-pre-wrap outline-none resize-none"
                />
                <p className="mt-3 text-xs text-sol-muted leading-relaxed">
                  {t("logicJsonHint", { example: "" })}<code>{`{"variables":{"total":{"min":10,"max":50},"known":{"min":1,"max":49}},"derived":{"missing":"total - known"},"constraints":["missing > 0"]}`}</code>
                </p>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-sol-border/5 bg-sol-surface/50 backdrop-blur-md flex items-center justify-between shrink-0">
          <p className="text-sm text-sol-muted italic">{t("footerNote")}</p>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="px-8 py-3 rounded-2xl font-bold text-sol-muted hover:text-sol-accent transition-colors">
              {t("cancel")}
            </button>
            <button form="template-form" type="submit" disabled={loading} className="flex items-center gap-3 px-10 py-3 bg-sol-accent text-sol-bg rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-sol-accent/30 disabled:opacity-50">
              <Save size={20} />
              {loading ? t("saving") : (editTemplateId ? t("saveChanges") : t("createTemplate"))}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
