/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The panel does not accept user-uploaded images. Serving images without
  // Next's native optimizer removes the vulnerable libvips path from runtime.
  images: {
    unoptimized: true
  },
  turbopack: {
    root: __dirname
  },
  async headers() {
    const scriptPolicy = process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com";
    const headers = [
      { key: 'Content-Security-Policy', value: [
        "default-src 'self'",
        scriptPolicy,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://thesvg.org https://cdn.modrinth.com",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-src https://challenges.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join('; ') },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }
    ];
    if (process.env.NODE_ENV === 'production') {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }
    return [{ source: '/(.*)', headers }];
  }
};

module.exports = nextConfig;
