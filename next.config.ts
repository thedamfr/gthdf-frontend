import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const environmentRemotePatterns = (process.env.NEXT_IMAGE_REMOTE_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .flatMap((origin) => {
    try {
      const pattern = new URL(origin);
      if (!['http:', 'https:'].includes(pattern.protocol)) {
        return [];
      }
      if (pattern.username || pattern.password || pattern.search || pattern.hash) {
        return [];
      }
      pattern.pathname = `${pattern.pathname.replace(/\/$/, '')}/**`;
      return [pattern];
    } catch {
      return [];
    }
  });

const nextConfig: NextConfig = {
  agentRules: false,
  output: 'standalone',
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/gthdf-media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'cellar-c2.services.clever-cloud.com',
        pathname: '/gthdf-media/**',
      },
      {
        protocol: 'https',
        hostname: 'cms.gthf.fr',
        pathname: '/uploads/**',
      },
      ...environmentRemotePatterns,
    ],
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
