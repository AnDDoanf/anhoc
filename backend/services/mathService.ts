import * as math from 'mathjs';

export interface LogicConfig {
  [key: string]: VariableRule;
}

type VariableRule =
  | number
  | number[]
  | {
      min?: number;
      max?: number;
      step?: number;
      choices?: number[];
      expression?: string;
      precision?: number;
    };

const toConfigObject = (config: any): any => {
  if (!config) return {};
  return typeof config === 'string' ? JSON.parse(config) : config;
};

const pickFromRule = (rule: VariableRule, vars: Record<string, number>): number | null => {
  if (typeof rule === 'number') return rule;

  if (Array.isArray(rule)) {
    if (rule.length === 0) return null;
    return rule[Math.floor(Math.random() * rule.length)];
  }

  if (!rule || typeof rule !== 'object') return null;

  if (rule.expression) {
    const result = math.evaluate(normalizeFormula(rule.expression), normalizeVars(vars));
    return typeof result === 'number' ? result : Number(result);
  }

  if (Array.isArray(rule.choices) && rule.choices.length > 0) {
    return rule.choices[Math.floor(Math.random() * rule.choices.length)];
  }

  if (typeof rule.min === 'number' && typeof rule.max === 'number') {
    const min = Math.min(rule.min, rule.max);
    const max = Math.max(rule.min, rule.max);
    const step = Math.abs(rule.step || 1) || 1;
    const choices = [];
    for (let i = min; i <= max; i += step) {
      choices.push(i);
    }
    const picked = choices[Math.floor(Math.random() * choices.length)];
    return typeof rule.precision === 'number' ? Number(picked.toFixed(rule.precision)) : picked;
  }

  return null;
};

const applyDerived = (vars: Record<string, number>, derived: any) => {
  if (!derived || typeof derived !== 'object') return;

  for (const [key, rule] of Object.entries(derived)) {
    const value = typeof rule === 'string'
      ? math.evaluate(normalizeFormula(rule), normalizeVars(vars))
      : pickFromRule(rule as VariableRule, vars);
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      vars[key] = Number(value);
    }
  }
};

const passesConstraints = (vars: Record<string, number>, constraints: any): boolean => {
  if (!Array.isArray(constraints) || constraints.length === 0) return true;

  return constraints.every((constraint) => {
    try {
      return Boolean(math.evaluate(normalizeFormula(String(constraint)), normalizeVars(vars)));
    } catch {
      return false;
    }
  });
};

export const generateVars = (config: any): Record<string, number> => {
  try {
    const configObj = toConfigObject(config);
    const logic = (configObj?.variables || configObj) as LogicConfig;
    const maxAttempts = Number(configObj?.max_attempts || 50);

    if (!logic || typeof logic !== 'object') return {};

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const vars: Record<string, number> = {};

      for (const [key, rule] of Object.entries(logic)) {
        const value = pickFromRule(rule as VariableRule, vars);
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          vars[key] = value;
        }
      }

      applyDerived(vars, configObj?.derived);
      if (passesConstraints(vars, configObj?.constraints)) return vars;
    }

    const fallbackVars: Record<string, number> = {};
    for (const [key, rule] of Object.entries(logic)) {
      const value = pickFromRule(rule as VariableRule, fallbackVars);
      if (value !== null && value !== undefined && !Number.isNaN(value)) fallbackVars[key] = value;
    }
    applyDerived(fallbackVars, configObj?.derived);
    return fallbackVars;
  } catch (e) {
    console.error("Failed to parse logic_config", e);
    return {};
  }
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

const normalizeBooleanAnswer = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 't', 'yes', 'y'].includes(normalized)) return true;
  if (['false', 'f', 'no', 'n'].includes(normalized)) return false;
  return null;
};

const normalizeTextAnswer = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).join(',');
  if (value && typeof value === 'object' && 'toArray' in value && typeof (value as any).toArray === 'function') {
    return normalizeTextAnswer((value as any).toArray());
  }
  return String(value).trim().toLowerCase().replace(/\s+/g, '');
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
  const normalizedBooleanAns = normalizeBooleanAnswer(studentAns);

  const allFormulas = [formula, ...(acceptedFormulas || [])];
  return allFormulas.some(f => {
    try {
      const result = math.evaluate(normalizeFormula(f), cleanVars);
      if (typeof result === 'boolean') {
        return normalizedBooleanAns !== null && result === normalizedBooleanAns;
      }
      if (Array.isArray(result) || typeof result === 'string' || (result && typeof result === 'object')) {
        return normalizeTextAnswer(result) === normalizeTextAnswer(studentAns);
      }
      if (isNaN(normalizedAns)) return false;
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
