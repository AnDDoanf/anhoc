import * as math from 'mathjs';

export interface LogicConfig {
  [key: string]: { min: number; max: number; step?: number };
}

export const generateVars = (config: any): Record<string, number> => {
  const vars: Record<string, number> = {};

  try {
    const configObj = typeof config === 'string' ? JSON.parse(config) : config;
    const logic = (configObj.variables || configObj) as LogicConfig;

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
  studentAns: string,
  acceptedFormulas?: string[]
): boolean => {
  if (!studentAns || studentAns.trim() === '') return false;
  const cleanVars = normalizeVars(vars);
  const normalizedAns = parseFloat(studentAns.replace(',', '.'));
  if (isNaN(normalizedAns)) return false;

  // Check all formulas (primary + any extra accepted ones)
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

export const evaluateFormula = (formula: string, vars: any): number | null => {
  try {
    return math.evaluate(normalizeFormula(formula), normalizeVars(vars));
  } catch {
    return null;
  }
};

/**
 * Generates shuffled multiple-choice answer options.
 * Includes the correct answer + (count-1) plausible distractors.
 * Distractors are offset by small random integers/fractions around the correct answer.
 */
export const generateChoices = (
  formula: string,
  vars: any,
  count: number = 4
): number[] => {
  const correct = evaluateFormula(formula, vars);
  if (correct === null) return [];

  const choicesSet = new Set<number>([
    parseFloat(correct.toFixed(2))
  ]);

  // Generate distractors
  const offsets = [-3, -2, -1, 1, 2, 3, 5, 10, -5, -10];
  let attempts = 0;
  while (choicesSet.size < count && attempts < 50) {
    attempts++;
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const distractor = parseFloat((correct + offset).toFixed(2));
    if (distractor > 0) choicesSet.add(distractor);
  }

  // Shuffle
  return Array.from(choicesSet).sort(() => Math.random() - 0.5);
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
    formatted = formatted.replace(new RegExp(`{{${k}}}`, 'g'), v as string);
  }

  return formatted;
};
