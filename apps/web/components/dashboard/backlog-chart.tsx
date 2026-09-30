"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { openCountLabel } from "@/lib/format";
import { TOOLTIP_SURFACE } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PLOT_H = 168;
const AXIS_H = 24;
const PAD = { top: 44, right: 0, left: 0 } as const;
const TIP_GAP = 8;

export function shortDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

function niceScale(max: number): { top: number; step: number } {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : 25;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

export function BacklogChart({ points, at }: { points: number[]; at: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = `${useId()}-area`;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const { top: yTop, step: yStep } = niceScale(Math.max(0, ...points));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + (1 - v / yTop) * PLOT_H;
  const base = PAD.top + PLOT_H;
  const crisp = (v: number) => Math.round(v) + 0.5;

  const line = points.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${x(n - 1)} ${base} L ${x(0)} ${base} Z`;
  const ticks = Array.from({ length: yTop / yStep + 1 }, (_, k) => k * yStep);

  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 72))));
  const xLabels = points
    .map((_, i) => i)
    .filter((i) => i === n - 1 || (i % every === 0 && n - 1 - i >= every));

  const last = n - 1;
  const shown = active ?? last;

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (n < 2 || innerW <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    setActive(Math.min(last, Math.max(0, Math.round((px / rect.width) * last))));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = active ?? last;
    setActive(Math.min(last, Math.max(0, from + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const tipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el) return;
    if (active === null || width === 0) {
      el.dataset.placed = "";
      return;
    }
    const w = el.offsetWidth;
    const min = PAD.left;
    const max = Math.max(min, width - PAD.right - w);
    const left = Math.min(Math.max(x(active) - w / 2, min), max);
    if (!el.dataset.placed) {
      el.style.transition = "none";
      el.style.transform = `translateX(${left}px)`;
      void el.offsetWidth;
      el.style.transition = "";
      el.dataset.placed = "1";
    } else {
      el.style.transform = `translateX(${left}px)`;
    }
  });

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="group"
      aria-label={`Odprti ticketi ob koncu tedna, zadnjih ${n} tednov. Puščici levo in desno premikata teden.`}
      onKeyDown={onKey}
      onFocus={() => setActive((a) => a ?? last)}
      onBlur={() => setActive(null)}
      className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      style={{ height: PLOT_H + PAD.top + AXIS_H }}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={PLOT_H + PAD.top + AXIS_H} aria-hidden="true" className="block overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--graph-fill)" }} />
              <stop offset="100%" style={{ stopColor: "var(--graph-fill)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={crisp(y(t))}
                y2={crisp(y(t))}
                style={{ stroke: "var(--border)" }}
                strokeWidth={1}
              />
              <text
                x={PAD.left}
                y={y(t) - 5}
                textAnchor="start"
                className="fill-foreground-faint text-xs tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {xLabels.map((i) => (
            <text
              key={at[i]}
              x={x(i)}
              y={base + 18}
              textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
              className={cn("text-xs tabular-nums", i === shown ? "fill-nav-foreground" : "fill-foreground-faint")}
            >
              {shortDay(at[i]!)}
            </text>
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            style={{ stroke: "var(--graph-line)" }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {active !== null && (
            <line
              x1={crisp(x(active))}
              x2={crisp(x(active))}
              y1={PAD.top}
              y2={base}
              style={{ stroke: "var(--graph-line)", strokeOpacity: 0.35 }}
              strokeWidth={1}
            />
          )}

          <circle
            cx={x(shown)}
            cy={y(points[shown]!)}
            r={5}
            style={{ fill: "var(--graph-line-dot)", stroke: "var(--background)" }}
            strokeWidth={2}
          />

          {active === null && (
            <text
              x={x(last)}
              y={y(points[last]!) - 12}
              textAnchor="end"
              className="fill-foreground text-sm font-semibold"
            >
              {points[last]}
            </text>
          )}

          <rect
            x={PAD.left}
            y={0}
            width={innerW}
            height={base}
            fill="transparent"
            onPointerMove={pick}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {width > 0 && n > 0 && (
        <div
          ref={tipRef}
          aria-live="polite"
          aria-hidden={active === null}
          className={cn(
            TOOLTIP_SURFACE,
            "pointer-events-none absolute left-0 whitespace-nowrap transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
            active === null && "opacity-0",
          )}
          style={{ bottom: PLOT_H + AXIS_H + TIP_GAP }}
        >
          {active !== null && (
            <>
              <span className="font-semibold">
                {points[active]} {openCountLabel(points[active]!)}
              </span>
              <span className="ml-2 text-muted-foreground">ob koncu tedna {shortDay(at[active]!)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
