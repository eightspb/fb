import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Для Docker - создает оптимизированную standalone сборку
  serverExternalPackages: ['jose'], // Include jose in standalone build
  
  // В Next.js 16+ instrumentation.ts работает автоматически
  
  // Пустой turbopack конфиг - требуется для Next.js 16+ чтобы подавить предупреждение
  // о конфликте webpack/turbopack конфигов
  turbopack: {},
  
  // Конфигурация для Server Actions - предотвращает ошибки с несуществующими actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? [process.env.SITE_URL || 'http://155.212.217.60'].filter(Boolean)
        : ['localhost:3000'],
    },
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
