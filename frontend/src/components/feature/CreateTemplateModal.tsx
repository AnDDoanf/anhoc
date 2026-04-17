"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Save, Database, Code2, Plus, Trash2 } from "lucide-react";
import { testService, CreateTemplateDTO } from "@/services/testService";
import { lessonService, type Lesson } from "@/services/lessonService";
import { isAxiosError } from "axios";

interface VariableDef {
  name: string;
  min: number | string;
  max: number | string;
}

type LogicVariableRange = {
  min?: number | string;
  max?: number | string;
};

type LogicConfigDraft = Record<string, unknown> & {
  variables?: Record<string, LogicVariableRange>;
  false_answers?: unknown[];
  items?: unknown;
  derived?: unknown;
  choices?: unknown;
};

type QuestionTemplate = CreateTemplateDTO & {
  id: string;
};

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

const QUESTION_TYPES = ["numeric_input", "true_false", "multiple_choices", "ordering", "theoretical_question"];

const DIFFICULTIES = ["easy", "medium", "hard"];

const toFiniteNumber = (value: number | string | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildLogicFromVariableDefs = (defs: VariableDef[]) => {
  const variables: Record<string, { min: number; max: number }> = {};
  for (const v of defs) {
    const key = v.name.trim();
    if (key) variables[key] = {
      min: toFiniteNumber(v.min),
      max: toFiniteNumber(v.max),
    };
  }
  return { variables };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === "object" && !Array.isArray(value)
);

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
  theoretical_question: {
    bodyEn: "Which statement is true about parallel lines?",
    bodyVi: "Mệnh đề nào đúng về hai đường thẳng song song?",
    formulas: ["They never intersect."],
    vars: [],
    logic: {
      false_answers: [
        "They always intersect at one point.",
        "They are always perpendicular.",
        "They must have different slopes.",
      ],
    },
  },
};

export default function CreateTemplateModal({ isOpen, onClose, onSuccess, editTemplateId }: Props) {
  const t = useTranslations("Questions.modal");
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // Simple fields
  const [lessonId, setLessonId] = useState("");
  const [templateType, setTemplateType] = useState("numeric_input");
  const [difficulty, setDifficulty] = useState("medium");
  const [bodyEn, setBodyEn] = useState("Calculate $x$ + $y$");
  const [bodyVi, setBodyVi] = useState("Tính $x$ + $y$");

  // Multiple accepted answer formulas (first = primary)
  const [acceptedFormulas, setAcceptedFormulas] = useState<string[]>(["x + y"]);
  const [falseAnswers, setFalseAnswers] = useState<string[]>(["", "", ""]);

  // Logic builder state
  const [variableDefs, setVariableDefs] = useState<VariableDef[]>(DEFAULT_VARS);
  const [logicJson, setLogicJson] = useState("");
  const [logicJsonDirty, setLogicJsonDirty] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [apiBodyJson, setApiBodyJson] = useState("");
  const [apiBodyJsonError, setApiBodyJsonError] = useState("");
  const syncingFromApiBodyRef = useRef(false);

  const buildLogicFromDefs = useCallback(() => buildLogicFromVariableDefs(variableDefs), [variableDefs]);

  const buildLogicConfig = useCallback(() => {
    try {
      const parsed = JSON.parse(logicJson);
      return parsed && typeof parsed === "object" ? parsed : buildLogicFromDefs();
    } catch {
      return buildLogicFromDefs();
    }
  }, [buildLogicFromDefs, logicJson]);

  const buildPayloadFromForm = useCallback((): CreateTemplateDTO => {
    const theoreticalFalseAnswers = falseAnswers.map((answer) => answer.trim()).filter(Boolean);

    return {
      lesson_id: lessonId === "" ? null : lessonId,
      template_type: templateType,
      difficulty,
      body_template_en: bodyEn,
      body_template_vi: bodyVi,
      accepted_formulas: templateType === "theoretical_question"
        ? [acceptedFormulas[0]?.trim() || ""].filter(Boolean)
        : acceptedFormulas.filter(f => f.trim()),
      logic_config: templateType === "theoretical_question"
        ? { false_answers: theoreticalFalseAnswers }
        : buildLogicConfig(),
    };
  }, [
    acceptedFormulas,
    bodyEn,
    bodyVi,
    buildLogicConfig,
    difficulty,
    falseAnswers,
    lessonId,
    templateType,
  ]);

  const applyPayloadToForm = (payload: Partial<CreateTemplateDTO>) => {
    syncingFromApiBodyRef.current = true;

    if ("lesson_id" in payload) {
      setLessonId(payload.lesson_id || "");
    }
    if (payload.template_type) {
      setTemplateType(payload.template_type);
    }
    if (payload.difficulty) {
      setDifficulty(payload.difficulty);
    }
    if (typeof payload.body_template_en === "string") {
      setBodyEn(payload.body_template_en);
    }
    if (typeof payload.body_template_vi === "string") {
      setBodyVi(payload.body_template_vi);
    }

    const nextAcceptedFormulas = Array.isArray(payload.accepted_formulas)
      ? payload.accepted_formulas.map((formula) => String(formula || ""))
      : [];
    if (Array.isArray(payload.accepted_formulas)) {
      setAcceptedFormulas(nextAcceptedFormulas.length > 0 ? nextAcceptedFormulas : [""]);
    }

    if ("logic_config" in payload) {
      const nextTemplateType = payload.template_type || templateType;
      const nextLogicConfig = payload.logic_config || {};
      setLogicJson(JSON.stringify(nextLogicConfig, null, 2));
      setLogicJsonDirty(true);

      if (nextTemplateType === "theoretical_question") {
        const falseAnswersFromConfig = Array.isArray((nextLogicConfig as { false_answers?: unknown[] })?.false_answers)
          ? (nextLogicConfig as { false_answers?: unknown[] }).false_answers?.map((answer) => String(answer || "")).slice(0, 3) || []
          : [];
        setFalseAnswers([
          falseAnswersFromConfig[0] || "",
          falseAnswersFromConfig[1] || "",
          falseAnswersFromConfig[2] || "",
        ]);
      } else if ((nextLogicConfig as { variables?: unknown })?.variables) {
        const variables = (nextLogicConfig as { variables: Record<string, { min?: number | string; max?: number | string }> }).variables;
        const defs = Object.entries(variables).map(([name, range]) => ({
          name,
          min: range?.min ?? 1,
          max: range?.max ?? 10,
        }));
        setVariableDefs(defs.length > 0 ? defs : DEFAULT_VARS);
      }
    }

    window.setTimeout(() => {
      syncingFromApiBodyRef.current = false;
    }, 0);
  };

  useEffect(() => {
    if (!isOpen || syncingFromApiBodyRef.current) return;
    setApiBodyJson(JSON.stringify(buildPayloadFromForm(), null, 2));
    setApiBodyJsonError("");
  }, [buildPayloadFromForm, isOpen]);

  const parseLogicConfig = useCallback((raw: unknown, primaryFormula: string, extraAccepted: string[]) => {
    setAcceptedFormulas(
      [primaryFormula, ...extraAccepted].filter(f => f.trim())
        .length > 0
        ? [primaryFormula, ...extraAccepted].filter(f => f.trim())
        : [primaryFormula]
    );
    try {
      const cfg = typeof raw === "string"
        ? JSON.parse(raw) as LogicConfigDraft
        : isRecord(raw) ? raw as LogicConfigDraft : {};
      setLogicJson(JSON.stringify(cfg || buildLogicFromVariableDefs(DEFAULT_VARS), null, 2));
      setLogicJsonDirty(true);
      const falseAnswersFromConfig = Array.isArray(cfg?.false_answers)
        ? cfg.false_answers.map((answer: unknown) => String(answer || "")).slice(0, 3)
        : [];
      setFalseAnswers([
        falseAnswersFromConfig[0] || "",
        falseAnswersFromConfig[1] || "",
        falseAnswersFromConfig[2] || "",
      ]);
      if (cfg?.variables) {
        const defs = Object.entries(cfg.variables).map(([name, range]) => ({
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
  }, []);

  useEffect(() => {
    if (!logicJsonDirty) {
      setLogicJson(JSON.stringify(buildLogicFromDefs(), null, 2));
    }
  }, [buildLogicFromDefs, variableDefs, logicJsonDirty]);

  const syncVariablesToLogicJson = (defs: VariableDef[]) => {
    const variableNames = defs
      .map((v) => String(v.name || "").trim())
      .filter(Boolean);

    if (templateType === "ordering") {
      setAcceptedFormulas([`[${variableNames.join(",")}]`]);
    }

    setLogicJson(prev => {
      let parsed: LogicConfigDraft = {};
      try {
        const parsedJson = prev ? JSON.parse(prev) : {};
        parsed = isRecord(parsedJson) ? parsedJson as LogicConfigDraft : {};
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

      const nextConfig: LogicConfigDraft = { ...parsed, variables };

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
          const allTpl = await testService.listTemplates() as QuestionTemplate[];
          const curr = allTpl.find((template) => template.id === editTemplateId);
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
          setFalseAnswers(["", "", ""]);
          setVariableDefs(preset.vars);
          setLogicJson(JSON.stringify(preset.logic, null, 2));
          setLogicJsonDirty(false);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };
    fetchData();
  }, [isOpen, editTemplateId, parseLogicConfig]);

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
    const presetFalseAnswers = (preset.logic as { false_answers?: unknown[] }).false_answers;
    const nextFalseAnswers = Array.isArray(presetFalseAnswers)
      ? presetFalseAnswers.map((answer) => String(answer)).slice(0, 3)
      : [];
    setFalseAnswers([
      nextFalseAnswers[0] || "",
      nextFalseAnswers[1] || "",
      nextFalseAnswers[2] || "",
    ]);
    setVariableDefs(preset.vars);
    setLogicJson(JSON.stringify(preset.logic, null, 2));
    setLogicJsonDirty(true);
  };

  const handleApiBodyJsonChange = (value: string) => {
    setApiBodyJson(value);

    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setApiBodyJsonError(t("invalidApiBodyJson"));
        return;
      }

      setApiBodyJsonError("");
      applyPayloadToForm(parsed);
    } catch {
      setApiBodyJsonError(t("invalidApiBodyJson"));
    }
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      try {
        if (templateType !== "theoretical_question") {
          JSON.parse(logicJson);
        }
      } catch {
        alert(t("invalidLogicJson"));
        setLoading(false);
        return;
      }

      let payload: CreateTemplateDTO;
      if (devMode) {
        try {
          const parsed = JSON.parse(apiBodyJson);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            alert(t("invalidApiBodyJson"));
            setLoading(false);
            return;
          }
          payload = parsed as CreateTemplateDTO;
        } catch {
          alert(t("invalidApiBodyJson"));
          setLoading(false);
          return;
        }
      } else {
        payload = buildPayloadFromForm();
      }

      const payloadTemplateType = payload.template_type;
      const theoreticalFalseAnswers = Array.isArray((payload.logic_config as { false_answers?: unknown[] })?.false_answers)
        ? (payload.logic_config as { false_answers?: unknown[] }).false_answers?.map((answer) => String(answer || "").trim()).filter(Boolean) || []
        : [];
      if (payloadTemplateType === "theoretical_question") {
        if (!payload.accepted_formulas?.[0]?.trim() || theoreticalFalseAnswers.length !== 3) {
          alert(t("theoreticalAnswerError"));
          setLoading(false);
          return;
        }
      }

      if (editTemplateId) {
        await testService.updateTemplate(editTemplateId, payload);
      } else {
        await testService.createTemplate(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save template:", err);
      const responseData = isAxiosError(err) && isRecord(err.response?.data)
        ? err.response.data
        : {};
      const message = typeof responseData.details === "string"
        ? responseData.details
        : typeof responseData.error === "string"
          ? responseData.error
          : t("saveError");
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
            <div className="flex flex-col gap-3 rounded-2xl border border-sol-border/10 bg-sol-bg/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-sol-muted">{t("creationMode")}</p>
                <p className="text-sm font-medium text-sol-text">
                  {devMode ? t("devModeHint") : t("normalModeHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!devMode) {
                    setApiBodyJson(JSON.stringify(buildPayloadFromForm(), null, 2));
                    setApiBodyJsonError("");
                  }
                  setDevMode((current) => !current);
                }}
                className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                  devMode
                    ? "bg-sol-accent text-sol-bg shadow-lg shadow-sol-accent/20"
                    : "border border-sol-accent/20 text-sol-accent hover:bg-sol-accent/10"
                }`}
              >
                {devMode ? t("normalMode") : t("devMode")}
              </button>
            </div>

            {devMode ? (
              <div className="space-y-3 rounded-2xl border border-sol-border/10 bg-sol-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-black uppercase tracking-widest text-sol-muted">{t("apiBody")}</label>
                  <span className={`text-xs font-bold ${apiBodyJsonError ? "text-red-500" : "text-sol-accent"}`}>
                    {apiBodyJsonError || t("apiBodySynced")}
                  </span>
                </div>
                <textarea
                  value={apiBodyJson}
                  onChange={(e) => handleApiBodyJsonChange(e.target.value)}
                  rows={24}
                  spellCheck={false}
                  className={`scrollbar-hidden w-full resize-none rounded-2xl border bg-transparent p-4 font-mono text-xs outline-none transition-colors ${
                    apiBodyJsonError
                      ? "border-red-500/40 text-red-400 focus:ring-2 focus:ring-red-500/20"
                      : "border-sol-border/20 text-sol-accent/90 focus:ring-2 focus:ring-sol-accent/30"
                  }`}
                />
                <p className="text-xs leading-relaxed text-sol-muted">{t("apiBodyHint")}</p>
              </div>
            ) : (
              <>

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
                  <Code2 size={14} /> {templateType === "theoretical_question" ? t("correctAnswer") : t("acceptedFormulas")}
                </label>
                <div className="space-y-2">
                  {(templateType === "theoretical_question" ? acceptedFormulas.slice(0, 1) : acceptedFormulas).map((f, idx) => (
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
                        placeholder={templateType === "theoretical_question" ? t("correctAnswerPlaceholder") : (idx === 0 ? t("formulaPlaceholder") : t("altFormulaPlaceholder"))}
                        className="flex-1 bg-sol-bg border border-sol-border/20 rounded-xl px-4 py-2.5 font-mono text-sm text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                      />
                      {templateType !== "theoretical_question" && idx > 0 && (
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
                  {templateType !== "theoretical_question" && (
                    <button
                      type="button"
                      onClick={() => setAcceptedFormulas(prev => [...prev, ""])}
                      className="flex items-center gap-1.5 text-xs font-bold text-sol-accent hover:bg-sol-accent/10 px-3 py-1.5 rounded-xl transition-all border border-sol-accent/20 mt-1"
                    >
                      <Plus size={13} /> {t("addFormula")}
                    </button>
                  )}
                </div>
              </div>

              {templateType === "theoretical_question" && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-sol-muted pl-1 flex items-center gap-2">
                    <Code2 size={14} /> {t("falseAnswers")}
                  </label>
                  <div className="space-y-2">
                    {falseAnswers.map((answer, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sol-muted w-6 shrink-0">{idx + 1}</span>
                        <input
                          required
                          type="text"
                          value={answer}
                          onChange={(e) => setFalseAnswers(prev => {
                            const next = [...prev];
                            next[idx] = e.target.value;
                            return next;
                          })}
                          placeholder={t("falseAnswerPlaceholder", { index: idx + 1 })}
                          className="flex-1 bg-sol-bg border border-sol-border/20 rounded-xl px-4 py-2.5 text-sm text-sol-text focus:ring-2 focus:ring-sol-accent/30 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-sol-muted leading-relaxed">{t("theoreticalHint")}</p>
                </div>
              )}
            </div>

            {/* Row 4: Variable Builder */}
            {templateType !== "theoretical_question" && (
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
            )}
              </>
            )}

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
