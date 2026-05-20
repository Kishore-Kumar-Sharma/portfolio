/** @type {import('next').NextConfig} */
// Permissions-Policy: deny everything we don't actually use. Newer features
// added by browsers default to "allowed" unless we explicitly disallow them,
// so this list is deliberately exhaustive rather than minimal.
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'bluetooth=()',
  'browsing-topics=()',   // replacement for the older interest-cohort=()
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',    // allow self for code blocks / embeds that need it
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'identity-credentials-get=()',
  'idle-detection=()',
  'interest-cohort=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'otp-credentials=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-create=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'storage-access=()',
  'usb=()',
  'web-share=(self)',     // allow self so the ShareBar can use navigator.share
  'xr-spatial-tracking=()',
].join(', ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // DENY (not SAMEORIGIN) to mirror the CSP `frame-ancestors 'none'` directive
  // — keeps legacy browsers consistent with the modern policy.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  // Isolates this site's browsing context — defends against window.opener
  // tampering and cross-origin Spectre-style leaks. Safe for a content site.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Mild privacy — disable speculative DNS prefetch for off-site links.
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // 301 redirects from the old /notes paths to the new /writing paths.
    // Preserves SEO equity for any indexed URLs (GSC, backlinks, social shares).
    // Article assets (the SVG diagrams) used to live under /public/notes/* but
    // were moved to /public/writing/* — redirects fire BEFORE static-file
    // resolution, so leaving them under /notes/ caused 404s for image refs.
    // Any old /notes/foo.svg URL still resolves: redirect → /writing/foo.svg.
    return [
      { source: '/notes', destination: '/writing', permanent: true },
      { source: '/notes/:path*', destination: '/writing/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
