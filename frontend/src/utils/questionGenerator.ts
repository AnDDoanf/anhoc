// src/utils/questionGenerator.ts
import { evaluateFormula, formatTemplate, generateVars } from "./mathService";

interface Template {
  template_type?: string;
  logic_config: any;
  body_template_vi: string;
  accepted_formulas?: string[];
  answer_formula?: string;
}

export function generateQuestion(template: Template) {
  const isTheoretical = template.template_type === "theoretical_question";
  const variables = isTheoretical ? {} : generateVars(template.logic_config);
  const question = formatTemplate(template.body_template_vi, variables);
  const formula = template.accepted_formulas?.[0] || template.answer_formula || "";
  const answer = isTheoretical ? formula : evaluateFormula(formula, variables);

  return { question, answer };
}
