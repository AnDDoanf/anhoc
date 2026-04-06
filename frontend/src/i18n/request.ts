import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // Read the locale from the cookie, default to 'en'
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default
  };
});