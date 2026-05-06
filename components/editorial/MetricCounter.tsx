"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

export function MetricCounter({
  value,
  suffix = "",
  duration = 1.6,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const isInt = Number.isInteger(value);
  const display = useTransform(motionValue, (latest) =>
    isInt ? Math.round(latest).toString() : latest.toFixed(1)
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, motionValue, value, duration]);

  return (
    <span className="num inline-flex items-baseline" ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix && <span aria-hidden>{suffix}</span>}
    </span>
  );
}
