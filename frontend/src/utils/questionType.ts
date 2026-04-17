import { evaluateFormula, formatTemplate } from "./mathService";

export type QuestionType = "numeric_input" | "true_false" | "multiple_choices" | "ordering" | "theoretical_question";

export interface ChoiceOption {
  label: string;
  value: string;
}

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const toConfig = (logicConfig: unknown): Record<string, unknown> => {
  if (typeof logicConfig === "string") {
    try {
      return asObject(JSON.parse(logicConfig));
    } catch {
      return {};
    }
  }
  return asObject(logicConfig);
};

export const normalizeQuestionType = (templateType?: string): QuestionType => {
  const type = (templateType || "").toLowerCase();
  if (type === "theoretical_question" || type === "theory" || type === "conceptual_question") return "theoretical_question";
  if (type === "true_fasle" || type === "true_false" || type.includes("yes_no")) return "true_false";
  if (type === "multiple_choices" || type === "multiple_choice") return "multiple_choices";
  if (type === "ordering" || type === "order") return "ordering";
  return "numeric_input";
};

export const getPrimaryFormula = (template: { accepted_formulas?: string[] }): string => {
  return template.accepted_formulas?.[0] || "";
};

export const getExpectedAnswer = (
  template: { accepted_formulas?: string[] },
  vars: Record<string, number>
): string => {
  const formula = getPrimaryFormula(template);
  const evaluated = evaluateFormula(formula, vars);
  return evaluated !== null && evaluated !== undefined ? String(evaluated) : formula;
};

export const getChoiceOptions = (
  template: { template_type?: string; logic_config?: unknown; accepted_formulas?: string[] },
  vars: Record<string, number>,
  locale: string
): ChoiceOption[] => {
  const config = toConfig(template.logic_config);
  const questionType = normalizeQuestionType(template.template_type);

  if (questionType === "theoretical_question") {
    const correctAnswer = String(template.accepted_formulas?.[0] || "").trim();
    const falseAnswers = Array.isArray(config.false_answers) ? config.false_answers : [];
    return [correctAnswer, ...falseAnswers.map((answer) => String(answer || "").trim())]
      .filter(Boolean)
      .map((value) => ({ label: value, value }))
      .sort(() => Math.random() - 0.5);
  }

  const rawChoices = Array.isArray(config.choices) ? config.choices : [];

  if (rawChoices.length > 0) {
    const seen = new Set<string>();
    return rawChoices.flatMap((choice, index) => {
      const item = asObject(choice);
      const formula = String(item.formula ?? item.value ?? "");
      const evaluated = formula ? evaluateFormula(formula, vars) : null;
      const value = evaluated !== null && evaluated !== undefined ? String(evaluated) : formula;
      const localeLabel = locale === "vi" ? item.label_vi : item.label_en;
      const fallbackLabel = item.label ?? localeLabel ?? value;
      const identity = `${fallbackLabel}-${value}`;

      if (seen.has(identity)) return [];
      seen.add(identity);

      return {
        label: formatTemplate(String(fallbackLabel || `Option ${index + 1}`), vars),
        value,
      };
    });
  }

  const expected = getExpectedAnswer(template, vars);
  const numericExpected = Number(expected);
  if (!Number.isNaN(numericExpected)) {
    const values = new Set<string>([String(numericExpected)]);
    [-2, -1, 1, 2, 3].forEach((offset) => values.add(String(numericExpected + offset)));
    return Array.from(values)
      .slice(0, 4)
      .sort(() => Math.random() - 0.5)
      .map((value) => ({ label: value, value }));
  }

  return [
    { label: locale === "vi" ? "Đúng" : "True", value: "true" },
    { label: locale === "vi" ? "Sai" : "False", value: "false" },
  ];
};

export const getOrderingItems = (
  template: { logic_config?: unknown },
  vars: Record<string, number>,
  locale: string
): ChoiceOption[] => {
  const config = toConfig(template.logic_config);
  const rawItems = Array.isArray(config.items) ? config.items : [];

  const items = rawItems.map((item, index) => {
    const objectItem = asObject(item);
    const value = String(objectItem.value ?? objectItem.formula ?? index + 1);
    const localeLabel = locale === "vi" ? objectItem.label_vi : objectItem.label_en;
    const label = String(objectItem.label ?? localeLabel ?? value);
    return {
      label: formatTemplate(label, vars),
      value: formatTemplate(value, vars),
    };
  });

  return items.sort(() => Math.random() - 0.5);
};

export const makeOrderingAnswer = (items: ChoiceOption[]): string => {
  return items.map((item) => item.value).join(",");
};
