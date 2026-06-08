// 1. Define your locales
export type Locale = 'en' | 'vi';

// 2. Map the imports without using 'any'
// We use 'ReturnType' or just let TS infer the module shape
const dictionaries = {
  en: () => import('./en.json').then((module) => module.default),
  vi: () => import('./vi.json').then((module) => module.default),
};

// Locale files are allowed to drift slightly while we evolve features.
export const getDictionary = async (locale: Locale): Promise<Record<string, unknown>> => {
  return dictionaries[locale]();
};
