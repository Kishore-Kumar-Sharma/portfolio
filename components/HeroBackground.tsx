'use client';

import { useEffect, useState } from 'react';

export const HeroBackground = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="absolute inset-0 -z-10 overflow-hidden bg-background opacity-0" />;

  return (
    <div className="absolute inset-0 -z-10 bg-background pointer-events-none overflow-hidden animate-in fade-in duration-1000">

      {/* 
        Fully Visible Dot Pattern
        We combine the scrolling animation from CSS with the parallax mouse movement 
      */}
      <div
        className="absolute inset-0 bg-dot-pattern opacity-100 dark:opacity-80 transition-transform duration-200 ease-out"
      />

      {/* Subtle Primary Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-80" />

      {/* Bottom fade out to seamlessly blend into the next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

    </div>
  );
};