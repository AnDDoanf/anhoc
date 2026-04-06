// src/utils/questionGenerator.ts
import { evaluate } from "mathjs";

interface Template {
  logic_config: Record<string, { min: number; max: number }>;
  body_template_vi: string;
  answer_formula: string;
}

export function generateQuestion(template: Template) {
  const variables: Record<string, number> = {};

  Object.entries(template.logic_config).forEach(([key, config]: [string, { min: number; max: number }]) => {
    variables[key] =
      Math.floor(Math.random() * (config.max - config.min + 1)) +
      config.min;
  });

  let question = template.body_template_vi;

  Object.entries(variables).forEach(([key, value]) => {
    question = question.replaceAll(`{{${key}}}`, String(value));
  });

  const answer = evaluate(template.answer_formula, variables);

  return { question, answer };
}