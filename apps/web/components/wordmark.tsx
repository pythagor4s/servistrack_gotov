import { useId } from "react";

import { cn } from "@/lib/utils";

const ERODE = 11;

const MARK_VIEW_BOX = "403 304.95 218.70 263.74";

const RIBBONS = [
  "M598.835 423.661C588.436 413.354 577.246 407.518 563.422 403.346C563.291 430.11 562.645 452.429 542.121 472.704C520.27 494.289 495.948 493.803 472.844 493.342C450.252 492.891 428.826 492.464 412.017 512.717C403.576 522.887 400.219 534.922 400.04 547.962C399.961 553.713 400.005 559.473 400.048 565.229C400.064 567.339 400.08 569.449 400.09 571.557L459.742 571.591L508.026 571.599C510.255 571.6 512.686 571.621 515.22 571.643C523.634 571.717 533.18 571.801 540.203 571.181C561.837 569.267 582.119 559.839 597.529 544.534C614.263 527.88 623.546 506.562 623.581 482.918C623.661 460.637 614.737 439.268 598.835 423.661Z",
  "M499.185 301.986C495.246 301.953 490.188 301.911 487.263 302.208C387.912 309.828 367.77 439.808 459.018 470.606C459.004 467.593 458.953 464.659 458.903 461.793C458.538 440.79 458.237 423.432 472.887 405.315C485.549 390.343 500.81 382.516 520.402 380.641C528.936 379.825 537.903 380.117 546.893 380.411C570.691 381.189 594.647 381.971 611.15 362.188C625.156 345.398 624.909 329.483 624.612 310.267C624.57 307.564 624.527 304.796 624.523 301.95L528.384 301.957L502.07 302.004C501.233 302.003 500.25 301.995 499.185 301.986Z",
];
const DOT = "M528.208 434.816C527.532 424.452 518.663 416.55 508.29 417.069C501.439 417.412 495.305 421.42 492.238 427.556C489.171 433.692 489.649 441.004 493.487 446.689C497.325 452.375 503.929 455.551 510.766 455C521.118 454.167 528.885 445.179 528.208 434.816Z";

const DOT_SCALE = 1.15;
const DOT_CENTRE = { x: 509.24, y: 436.05 };

export function Wordmark({ className }: { className?: string }) {
  const maskId = `wordmark-mark-${useId()}`;

  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-[0.246em] font-wordmark leading-none tracking-tight text-wordmark",
        className,
      )}
    >
      <svg
        viewBox={MARK_VIEW_BOX}
        aria-hidden="true"
        focusable="false"
        className="h-[1.1178em] w-auto shrink-0 fill-current"
      >
        <mask id={maskId} maskUnits="userSpaceOnUse" x="380" y="280" width="270" height="320">
          {RIBBONS.map((d) => (
            <path
              key={d}
              d={d}
              fill="#fff"
              stroke="#000"
              strokeWidth={ERODE * 2}
              strokeLinejoin="round"
            />
          ))}
        </mask>
        <g mask={`url(#${maskId})`}>
          {RIBBONS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g
          transform={`translate(${DOT_CENTRE.x} ${DOT_CENTRE.y}) scale(${DOT_SCALE}) translate(${-DOT_CENTRE.x} ${-DOT_CENTRE.y})`}
        >
          <path d={DOT} />
        </g>
      </svg>
      <span>
        <span className="font-medium">Servis</span>
        <span className="font-medium">Track</span>
      </span>
    </span>
  );
}
