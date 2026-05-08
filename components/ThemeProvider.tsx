"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import { MotionConfig } from "framer-motion";

type Props = ThemeProviderProps & { nonce?: string };

export function ThemeProvider({ children, nonce, ...props }: Props) {
  return (
    <NextThemesProvider
      {...props}
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
