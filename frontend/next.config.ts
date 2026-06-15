import './src/utils/env.ts';
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

const configuredChatbotUrl =
  process.env.CHATBOT_URL?.trim() ||
  process.env.INTERNAL_CHATBOT_URL?.trim() ||
  process.env.NEXT_PUBLIC_CHATBOT_API_URL?.trim() ||
  '';

const normalizedChatbotUrl = configuredChatbotUrl && !configuredChatbotUrl.startsWith('/') && !configuredChatbotUrl.startsWith('http://localhost:5000')
  ? configuredChatbotUrl.replace(/\/+$/, '')
  : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rewritesList = [];

    // Route Chatbot specific requests if configured
    if (normalizedChatbotUrl) {
      rewritesList.push({
        source: '/api/v1/chat/:path*',
        destination: `${normalizedChatbotUrl}/api/v1/chat/:path*`,
      });
      rewritesList.push({
        source: '/api/v1/tutor/:path*',
        destination: `${normalizedChatbotUrl}/api/v1/tutor/:path*`,
      });
      rewritesList.push({
        source: '/health',
        destination: `${normalizedChatbotUrl}/health`,
      });
    }

    // Route Backend general requests
    if (normalizedBackendApiUrl && !normalizedBackendApiUrl.startsWith('/')) {
      rewritesList.push({
        source: '/api/v1/:path*',
        destination: `${normalizedBackendApiUrl}/:path*`,
      });
    }

    return rewritesList;
  },
};

export default withNextIntl(nextConfig);
