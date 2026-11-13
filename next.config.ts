import type { NextConfig } from 'next';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const nextConfig: NextConfig = {
  distDir: process.env.RGU_BUILD_DIR || '.next',
  poweredByHeader: false,
  async rewrites() {
    const target = process.env.RGU_API_PROXY_TARGET?.replace(/\/$/, '');
    if (!target) return [];
    let targetHost = '';
    try {
      targetHost = new URL(target).host.toLowerCase();
    } catch {
      return [];
    }
    if (!targetHost) return [];
    // Never proxy the API path back to the deployment that serves it: that
    // self-rewrite is an infinite loop and takes every API call offline.
    return [
      {
        source: '/rgu/:path*',
        destination: `${target}/:path*`,
        has: [{ type: 'host', value: `^(?!${escapeRegExp(targetHost)}$).*` }],
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
