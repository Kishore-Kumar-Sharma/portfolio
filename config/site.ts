/**
 * Site-wide configuration.
 * Set BASE_URL and GA_MEASUREMENT_ID in your .env.local (dev) or Vercel dashboard (prod).
 * Fallbacks are used so the build never fails if env vars are missing.
 */
export const siteConfig = {
  baseUrl: process.env.BASE_URL ?? "https://kishore-kumar-sharma.dev",
  gaMeasurementId: process.env.GA_MEASUREMENT_ID ?? "G-XXXXXXXXXX",
};
