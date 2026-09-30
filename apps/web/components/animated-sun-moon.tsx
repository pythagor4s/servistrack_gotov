"use client";

import { useEffect, useRef } from "react";
import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";

import { cn } from "@/lib/utils";

const SUN_D =
  "M8 12 C8 12.27 8.03 12.53 8.08 12.78 C8.13 13.04 8.2 13.29 8.3 13.53 C8.4 13.77 8.53 14 8.67 14.22 C8.74 14.33 8.82 14.43 8.91 14.54 C8.99 14.64 9.08 14.73 9.17 14.83 C9.27 14.92 9.36 15.01 9.46 15.09 C9.57 15.18 9.67 15.26 9.78 15.33 C10 15.47 10.23 15.6 10.47 15.7 C10.71 15.8 10.96 15.87 11.22 15.92 C11.47 15.97 11.73 16 12 16 C12.27 16 12.53 15.97 12.78 15.92 C13.04 15.87 13.29 15.8 13.53 15.7 C13.77 15.6 14 15.47 14.22 15.33 C14.44 15.18 14.64 15.02 14.83 14.83 C15.02 14.64 15.18 14.44 15.33 14.22 C15.47 14 15.6 13.77 15.7 13.53 C15.8 13.29 15.87 13.04 15.92 12.78 C15.97 12.53 16 12.27 16 12 C16 11.73 15.97 11.47 15.92 11.22 C15.87 10.96 15.8 10.71 15.7 10.47 C15.6 10.23 15.47 10 15.33 9.78 C15.18 9.56 15.02 9.36 14.83 9.17 C14.64 8.98 14.44 8.82 14.22 8.67 C14 8.53 13.77 8.4 13.53 8.3 C13.29 8.2 13.04 8.13 12.78 8.08 C12.53 8.03 12.27 8 12 8 C11.73 8 11.47 8.03 11.22 8.08 C10.96 8.13 10.71 8.2 10.47 8.3 C10.23 8.4 10 8.53 9.78 8.67 C9.56 8.82 9.36 8.98 9.17 9.17 C8.98 9.36 8.82 9.56 8.67 9.78 C8.53 10 8.4 10.23 8.3 10.47 C8.2 10.71 8.13 10.96 8.08 11.22 C8.03 11.47 8 11.73 8 12";

const MOON_D =
  "M3.13 10.44 C3.03 11.01 2.98 11.59 2.99 12.17 C3 12.75 3.07 13.33 3.19 13.89 C3.31 14.45 3.49 15 3.71 15.53 C3.93 16.05 4.21 16.56 4.53 17.03 C4.85 17.51 5.22 17.96 5.63 18.37 C6.04 18.78 6.49 19.15 6.97 19.47 C7.44 19.79 7.95 20.07 8.47 20.29 C9 20.51 9.55 20.69 10.11 20.81 C10.67 20.93 11.25 21 11.83 21.01 C12.41 21.02 12.99 20.97 13.56 20.87 C14.12 20.77 14.68 20.62 15.21 20.41 C15.75 20.21 16.26 19.95 16.75 19.65 C17.24 19.34 17.7 18.99 18.13 18.59 C18.55 18.2 18.94 17.76 19.27 17.3 C19.61 16.83 19.9 16.34 20.15 15.82 C20.39 15.3 20.58 14.76 20.72 14.2 C20.86 13.65 20.95 13.07 20.98 12.49 C21.01 12.09 20.52 11.88 20.18 12.09 C19.6 12.45 18.98 12.71 18.32 12.86 C17.67 13 16.99 13.04 16.32 12.97 C15.64 12.89 14.99 12.7 14.39 12.41 C13.79 12.12 13.23 11.73 12.75 11.25 C12.27 10.77 11.88 10.21 11.59 9.61 C11.3 9.01 11.11 8.36 11.03 7.68 C10.96 7.01 11 6.33 11.14 5.68 C11.29 5.02 11.55 4.4 11.91 3.82 C12.13 3.48 11.92 3 11.51 3.02 C10.93 3.05 10.35 3.14 9.8 3.28 C9.24 3.42 8.7 3.61 8.18 3.85 C7.66 4.1 7.17 4.39 6.7 4.73 C6.24 5.06 5.8 5.45 5.41 5.87 C5.01 6.3 4.66 6.76 4.35 7.25 C4.05 7.74 3.79 8.25 3.59 8.79 C3.38 9.32 3.23 9.88 3.13 10.44";

const MORPH = { duration: 0.8, ease: "backInOut" } as const;

const PATH_VARIANTS: Variants = {
  initial: { rotate: 0, d: SUN_D, transition: MORPH },
  moonRest: { rotate: 0, d: MOON_D },
  animate: { rotate: [-120, 0], d: [SUN_D, SUN_D, MOON_D], transition: MORPH },
};

const RAYS = { duration: 0.6, ease: "backIn" } as const;

const G_VARIANTS: Variants = {
  initial: { scale: 1, rotate: 0, opacity: 1, transition: RAYS },
  moonRest: { scale: 0.5, rotate: 160, opacity: 0 },
  animate: { scale: [1, 0.5], rotate: [0, 160], opacity: [1, 0], transition: RAYS },
};

const CENTRE_12 = { transformBox: "view-box", originX: "12px", originY: "12px" } as const;

export function AnimatedSunMoon({
  phase,
  className,
}: {
  phase: "sun" | "moon";
  className?: string;
}) {
  const controls = useAnimation();
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current === phase) return;
    prevPhase.current = phase;
    void controls.start(phase === "moon" ? "animate" : "initial");
  }, [phase, controls]);

  return (
    <motion.svg
      className={cn(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      initial={phase === "moon" ? "moonRest" : "initial"}
      animate={controls}
    >
      <motion.path d={SUN_D} variants={PATH_VARIANTS} />
      <motion.g variants={G_VARIANTS} style={CENTRE_12}>
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </motion.g>
    </motion.svg>
  );
}
