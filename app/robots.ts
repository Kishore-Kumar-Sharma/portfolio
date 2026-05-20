import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config/site'

// AI / LLM crawlers explicitly allowed. Listed individually (rather than relying
// on the wildcard) so each is reflected as its own rule in robots.txt — some
// crawlers honour only their own named record. Add or flip to "disallow" here
// if a particular bot ever needs to be excluded.
const AI_BOTS = [
  'GPTBot',            // OpenAI search/training crawler
  'OAI-SearchBot',     // OpenAI ChatGPT browsing/search
  'ChatGPT-User',      // OpenAI on-demand user fetch
  'ClaudeBot',         // Anthropic crawler
  'Claude-Web',        // Anthropic browsing
  'anthropic-ai',      // legacy anthropic UA
  'PerplexityBot',     // Perplexity index
  'Perplexity-User',   // Perplexity on-demand
  'Google-Extended',   // Google Gemini/Vertex training opt-in
  'Applebot-Extended', // Apple Intelligence
  'Bytespider',        // ByteDance / Doubao
  'CCBot',             // Common Crawl (feeds many LLMs)
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'cohere-ai',
  'YouBot',
  'Diffbot',
  'Amazonbot',
  'DuckAssistBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
    host: siteConfig.baseUrl,
  }
}
