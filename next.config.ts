import type { NextConfig } from 'next';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const nextConfig: NextConfig = {
  distDir: process.env.RGU_BUILD_DIR || '.next',
  poweredByHeader: false,
  async rewrites() {
    const browserApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    const target = process.env.RGU_API_PROXY_TARGET?.replace(/\/$/, '');
    if (!target) {
      if (browserApiBase === '/rgu')
        throw new Error(
          'RGU_API_PROXY_TARGET is required when NEXT_PUBLIC_API_BASE_URL=/rgu.',
        );
      return [];
    }
    let targetHost = '';
    try {
      const parsed = new URL(target);
      if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname))
        throw new Error('The production API proxy target must use HTTPS.');
      targetHost = parsed.host.toLowerCase();
    } catch {
      throw new Error('RGU_API_PROXY_TARGET must be a valid HTTPS backend URL.');
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
