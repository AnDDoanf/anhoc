import * as math from 'mathjs';

export interface LogicConfig {
  [key: string]: { min: number; max: number; step?: number };
}

export const generateVars = (config: any): Record<string, number> => {
  const vars: Record<string, number> = {};
  const logic = config as LogicConfig;

  for (const [key, range] of Object.entries(logic)) {
    const step = range.step || 1;
    const choices = [];
    for (let i = range.min; i <= range.max; i += step) {
      choices.push(i);
    }
    vars[key] = choices[Math.floor(Math.random() * choices.length)];
  }
  return vars;
};

export const checkAnswer = (formula: string, vars: any, studentAns: string): boolean => {
  try {
    // Normalize VN decimal comma to dot
    const normalizedAns = parseFloat(studentAns.replace(',', '.'));
    const result = math.evaluate(formula, vars);
    
    // Check if result is close enough (to handle floating point)
    return Math.abs(result - normalizedAns) < 0.01;
  } catch {
    return false;
  }
};

export const formatTemplate = (template: string, vars: any): string => {
  return template.replace(/{{(\w+)}}/g, (_, key) => vars[key]?.toString() || `{{${key}}}`);
};