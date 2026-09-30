"use client";

export function IconGradient() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="icon-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
          <stop offset="0%" style={{ stopColor: "var(--icon-gradient-top)" }} />
          <stop offset="100%" style={{ stopColor: "var(--icon-gradient-bottom)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
