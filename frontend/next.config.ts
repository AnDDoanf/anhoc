import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const configuredBackendUrl =
  process.env.BACKEND_URL?.trim() ||
  process.env.INTERNAL_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  '';

const normalizedBackendApiUrl = configuredBackendUrl
  ? `${configuredBackendUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1`
  : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!normalizedBackendApiUrl || normalizedBackendApiUrl.startsWith('/')) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${normalizedBackendApiUrl}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
