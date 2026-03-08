/**
 * Site-wide configuration.
 * Update `baseUrl` here and it will reflect across SEO metadata, sitemap, robots, and JSON-LD.
 * Update `gaMeasurementId` with your Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX).
 */
export const siteConfig = {
  baseUrl: process.env.BASE_URL,
  gaMeasurementId: process.env.GA_MEASUREMENT_ID, // ← Replace with your actual GA4 Measurement ID
};
