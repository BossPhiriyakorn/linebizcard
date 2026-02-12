const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ดึง origin จาก BASE_URL และ ADDITIONAL_DEV_ORIGINS เพื่อให้ Next.js อนุญาต request จาก Cloudflare Tunnel (แก้ 502 / Blocked cross-origin to /_next/*)
function getAllowedOrigins() {
  const origins = new Set();
  const base = process.env.BASE_URL && String(process.env.BASE_URL).trim();
  if (base) {
    try {
      origins.add(new URL(base).origin);
    } catch (_) {}
  }
  const extra = process.env.ADDITIONAL_DEV_ORIGINS && String(process.env.ADDITIONAL_DEV_ORIGINS).trim();
  if (extra) {
    extra.split(',').forEach((url) => {
      const u = url.trim();
      if (u) {
        try {
          origins.add(new URL(u).origin);
        } catch (_) {}
      }
    });
  }
  return [...origins];
}

const devOrigins = getAllowedOrigins();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // เมื่อใช้ Turbopack (production build) กำหนด root ให้ชี้ไปที่ frontend
  turbopack: {
    root: path.resolve(__dirname),
  },
  // ลดงานตอน build — ถ้าไม่ใช้ next/image optimization เปิดไว้ได้
  images: { unoptimized: true },
  // อนุญาต origin จากโดเมนจริง (เช่น Cloudflare Tunnel) — แก้ "Blocked cross-origin request to /_next/*" และ 502
  allowedDevOrigins: devOrigins,
  // ลูกค้าเข้าใช้งานผ่าน LINE — /login และ /register พาไปหน้า LIFF login
  async redirects() {
    return [
      { source: '/login', destination: '/liff/login', permanent: false },
      { source: '/register', destination: '/liff/login', permanent: false },
    ];
  },
  // แบ่ง chunk แบบ bamboo-DB — ลด memory ตอน build และโอกาส build ค้าง
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              reuseExistingChunk: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'async',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
        runtimeChunk: isServer ? undefined : { name: 'runtime' },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
