import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Для Docker - создает оптимизированную standalone сборку
  serverExternalPackages: ['jose'], // Include jose in standalone build
  
  // Подавляем предупреждения о fs/zlib при сборке
  // Эти модули используются только на сервере (telegram-bot.ts, file-utils.ts)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Для клиентской сборки заменяем Node.js модули на пустые заглушки
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        zlib: false,
        path: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
  
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
