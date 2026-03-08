import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingActions } from "@/components/FloatingActions";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: '--font-space-grotesk' });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-jetbrains-mono' });

const { baseUrl } = siteConfig;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kishore Kumar Sharma | Senior Full Stack Engineer — Available for Hire",
    template: "%s | Kishore Kumar Sharma",
  },
  description:
    "Senior Full Stack Engineer (6.5+ yrs) specializing in Java/Spring Boot, NodeJS/NestJS, React, Angular, AWS & microservices. Available for full-time roles, contract work & consulting. Proven across Telecom, FinTech, GovTech & EdTech.",
  keywords: [
    // Identity
    "Kishore Kumar Sharma",
    "Kishore Kumar Sharma portfolio",
    // Hiring signals
    "Senior Full Stack Engineer for hire",
    "Full Stack Developer available for hire",
    "Software Engineer available India",
    "Hire Full Stack Developer India",
    "Remote Full Stack Developer",
    "Freelance Full Stack Engineer",
    "Contract Software Engineer India",
    "Full Stack Consultant",
    // Tech stack
    "Java Spring Boot developer",
    "NodeJS NestJS developer",
    "React Angular developer",
    "MERN Stack developer",
    "MEAN Stack developer",
    "AWS Cloud engineer",
    "Microservices architect",
    "Docker Kubernetes developer",
    // Location
    "Software Engineer Noida",
    "Full Stack Developer Delhi NCR",
    "Remote developer India",
    // Role signals
    "Senior Software Engineer",
    "Backend Engineer Java",
    "Full Stack Portfolio 2025",
    "Tech Lead India",
  ],
  authors: [{ name: "Kishore Kumar Sharma", url: baseUrl }],
  creator: "Kishore Kumar Sharma",
  publisher: "Kishore Kumar Sharma",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "Kishore Kumar Sharma — Portfolio",
    title: "Kishore Kumar Sharma | Senior Full Stack Engineer — Available for Hire",
    description:
      "6.5+ years building production-grade full-stack systems. Open to full-time, contract & consulting roles. Java, Spring Boot, NodeJS, React, Angular, AWS.",
    images: [
      {
        url: "/profile-picture.jpg",
        width: 1200,
        height: 630,
        alt: "Kishore Kumar Sharma — Senior Full Stack Engineer, Available for Hire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kishore Kumar Sharma | Senior Full Stack Engineer — Available for Hire",
    description:
      "6.5+ years across Java, Node.js, React, Angular & AWS. Open to full-time, contract & consulting. Let's build something great.",
    images: ["/profile-picture.jpg"],
    creator: "@kishoresharma",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kishore Kumar Sharma",
    jobTitle: "Senior Full Stack Engineer",
    url: baseUrl,
    email: "kishoresharma914@gmail.com",
    image: `${baseUrl}/profile-picture.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Noida",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    sameAs: [
      "https://www.linkedin.com/in/kishore-kumar-sharma-a8902917a/",
      "https://github.com/kishore-kumar-sharma",
    ],
    knowsAbout: [
      "Java", "Spring Boot", "NodeJS", "NestJS", "React", "Angular",
      "MERN Stack", "MEAN Stack", "AWS", "Microservices", "Docker", "Kubernetes",
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Analytics 4 — only in production */}
        {process.env.NODE_ENV === "production" && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaMeasurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${siteConfig.gaMeasurementId}', { page_path: window.location.pathname });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} font-mono bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navigation />
          <main className="pt-20">
            {children}
          </main>
          <Footer />
          <FloatingActions />
        </ThemeProvider>
      </body>
    </html>
  );
}
