import * as math from 'mathjs';

export interface LogicConfig {
  [key: string]: { min: number; max: number; step?: number };
}

export const generateVars = (config: any): Record<string, number> => {
  const vars: Record<string, number> = {};

  try {
    const configObj = typeof config === 'string' ? JSON.parse(config) : config;
    const logic = (configObj?.variables || configObj) as LogicConfig;

    if (!logic || typeof logic !== 'object') return vars;

    for (const [key, range] of Object.entries(logic)) {
      if (typeof range === 'object' && range !== null && 'min' in range && 'max' in range) {
        const step = range.step || 1;
        const choices = [];
        for (let i = range.min; i <= Math.max(range.min, range.max); i += step) {
          choices.push(i);
        }
        vars[key] = choices[Math.floor(Math.random() * choices.length)];
      }
    }
  } catch (e) {
    console.error("Failed to parse logic_config", e);
  }

  return vars;
};

const normalizeFormula = (formula: string): string => {
  if (!formula) return "";
  let f = formula.toLowerCase();
  f = f.replace(/math\./g, '');
  return f;
};

const normalizeVars = (vars: any): Record<string, number> => {
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(vars)) {
    normalized[k.toLowerCase()] = v as number;
  }
  return normalized;
};

export const checkAnswer = (
  formula: string,
  vars: any,
  studentAns: string | null | undefined,
  acceptedFormulas?: string[]
): boolean => {
  if (!studentAns || studentAns.trim() === '') return false;

  const cleanVars = normalizeVars(vars);
  const normalizedAns = parseFloat(studentAns.replace(',', '.'));
  if (isNaN(normalizedAns)) return false;

  const allFormulas = [formula, ...(acceptedFormulas || [])];
  return allFormulas.some(f => {
    try {
      const result = math.evaluate(normalizeFormula(f), cleanVars);
      return Math.abs(result - normalizedAns) < 0.01;
    } catch {
      return false;
    }
  });
};

export const formatTemplate = (template: string, vars: any): string => {
  if (!template) return "";
  const cleanVars = normalizeVars(vars);
  let formatted = template;

  // Step 1: Evaluate compound expressions inside ${...}$ syntax
  // e.g. ${(100-x)}$ → evaluated against vars → $49$
  formatted = formatted.replace(/\$\{([^}]+)\}\$/g, (_, expr) => {
    try {
      const result = math.evaluate(normalizeFormula(expr), cleanVars);
      return `$${result}$`;
    } catch {
      return `$${expr}$`; // fallback: show expression as-is
    }
  });

  // Step 2: Replace simple $varname$ placeholders
  for (const [k, v] of Object.entries(vars)) {
    formatted = formatted.replace(new RegExp(`\\$${k}\\$`, 'g'), `$${v}$`);
    formatted = formatted.replace(new RegExp(`{{${k}}}`, 'g'), v?.toString() || `{{${k}}}`);
  }

  return formatted;
};

export const evaluateFormula = (formula: string, vars: any): string | null => {
  try {
    const result = math.evaluate(normalizeFormula(formula), normalizeVars(vars));
    return result.toString();
  } catch {
    return null;
  }
};