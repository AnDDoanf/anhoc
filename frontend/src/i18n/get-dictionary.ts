// 1. Define your locales
export type Locale = 'en' | 'vi';

// 2. Map the imports without using 'any'
// We use 'ReturnType' or just let TS infer the module shape
const dictionaries = {
  en: () => import('./en.json').then((module) => module.default),
  vi: () => import('./vi.json').then((module) => module.default),
};

// 3. Use a clear return type
// This tells TS: "The return is whatever the 'en' dictionary function returns"
export const getDictionary = async (locale: Locale): Promise<typeof import('./en.json')> => {
  return dictionaries[locale]();
};