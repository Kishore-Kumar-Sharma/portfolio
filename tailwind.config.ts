import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", md: "2rem", lg: "3rem" },
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        // Editorial display (variable, with optical sizing)
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        // UI / body
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Code / metrics / kbd
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        subtle: "hsl(var(--subtle))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // Domain accent siblings (one chroma family, distinct hues)
        telecom: "hsl(var(--telecom))",
        fintech: "hsl(var(--fintech))",
        govtech: "hsl(var(--govtech))",
        edtech: "hsl(var(--edtech))",
      },
      fontSize: {
        // Fluid editorial scale
        "eyebrow": ["0.72rem", { lineHeight: "1rem", letterSpacing: "0.18em" }],
        "caption": ["0.8125rem", { lineHeight: "1.25rem" }],
        "body": ["1rem", { lineHeight: "1.65" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "lead": ["clamp(1.125rem, 1.6vw, 1.5rem)", { lineHeight: "1.55" }],
        "heading-sm": ["clamp(1.25rem, 2vw, 1.625rem)", { lineHeight: "1.25" }],
        "heading": ["clamp(1.75rem, 3.2vw, 2.625rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-sm": ["clamp(2.25rem, 4.5vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(3.25rem, 9vw, 8rem)", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
        "display-xl": ["clamp(4rem, 13vw, 12rem)", { lineHeight: "0.92", letterSpacing: "-0.045em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "trace-flow": {
          "0%": { strokeDashoffset: "200" },
          "100%": { strokeDashoffset: "0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "trace-flow": "trace-flow 2s ease-out forwards",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "marquee": "marquee 40s linear infinite",
        "caret-blink": "caret-blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
