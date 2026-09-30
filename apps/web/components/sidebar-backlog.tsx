"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useAuth } from "@/lib/auth";
import { useApiList } from "@/lib/useApi";
import type { Ticket } from "@/lib/types";
import { BACKLOG_WEEKS, FLOW_WEEKS, weeklyBacklog, weeklyFlow, type Backlog, type WeekFlow } from "@/lib/backlog";
import { formatDate, openCountLabel } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarSection } from "@/components/sidebar-section";
import { cn } from "@/lib/utils";

const FORM = "bars" as "bars" | "line";

export function SidebarBacklog() {
  const { isAdmin } = useAuth();
  const gradientId = `${useId()}-fill`;

  const { items, error } = useApiList<Ticket>(
    isAdmin ? "/tickets?limit=100" : null,
  );

  const backlog = useMemo(() => weeklyBacklog(items), [items]);
  const flow = useMemo(() => weeklyFlow(items), [items]);

  const lastGood = useRef<Backlog | null>(null);
  if (backlog.at.length > 0) lastGood.current = backlog;
  const view = backlog.at.length > 0 ? backlog : lastGood.current;

  if (!isAdmin) return null;

  const hasData = !error && view !== null;

  return (
    <div className="px-2 select-none">
      <SidebarSection
        label={FORM === "bars" ? "Novi in rešeni po tednih" : "Nerešeni po tednih"}
        collapsibleId="backlog"
      >
      <div className="px-3 pb-1">
        {hasData && view ? (
          FORM === "bars" && flow.length > 0 ? (
            <FlowBars weeks={flow} />
          ) : (
            <Sparkline points={view.points} at={view.at} gradientId={gradientId} />
          )
        ) : error ? (
          <p className="px-1 py-4 text-xs ">Podatkov ni bilo mogoče naložiti.</p>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </div>
      </SidebarSection>
    </div>
  );
}

const VIEW_W = 100;
const VIEW_H = 32;
const TOP_PAD = 3;

function Sparkline({
  points,
  at,
  gradientId,
}: {
  points: number[];
  at: string[];
  gradientId: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const { line, area, coords } = useMemo(() => {
    const max = Math.max(1, ...points);
    const stepX = points.length > 1 ? VIEW_W / (points.length - 1) : 0;
    const pts = points.map((v, i) => ({
      x: i * stepX,
      y: VIEW_H - (v / max) * (VIEW_H - TOP_PAD),
    }));
    const SMOOTH = 1;
    const at = (i: number) => pts[Math.min(pts.length - 1, Math.max(0, i))]!;
    let d = `M${pts[0]!.x.toFixed(2)},${pts[0]!.y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = at(i - 1);
      const p1 = at(i);
      const p2 = at(i + 1);
      const p3 = at(i + 2);
      const clamp = (y: number) => Math.min(VIEW_H, Math.max(TOP_PAD / 2, y));
      const c1x = p1.x + ((p2.x - p0.x) / 6) * SMOOTH;
      const c1y = clamp(p1.y + ((p2.y - p0.y) / 6) * SMOOTH);
      const c2x = p2.x - ((p3.x - p1.x) / 6) * SMOOTH;
      const c2y = clamp(p2.y - ((p3.y - p1.y) / 6) * SMOOTH);
      d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return { line: d, area: `${d} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`, coords: pts };
  }, [points]);

  const track = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || points.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    setActive((prev) => (prev === i ? prev : i));
  };

  const shown = active ?? points.length - 1;
  const point = coords[shown]!;

  return (
    <>
      <div className="relative" onPointerMove={track} onPointerLeave={() => setActive(null)}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="h-12 w-full"
          role="img"
          aria-label={`Odprti zahtevki po tednih, zadnjih ${BACKLOG_WEEKS} tednov: ${points.join(", ")}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="[stop-color:var(--graph-fill)]" />
              <stop offset="1" className="[stop-color:var(--graph-fill)]" stopOpacity={0} />
            </linearGradient>
          </defs>
          {coords.map((p, i) => (
            <line
              key={i}
              x1={p.x}
              y1={0}
              x2={p.x}
              y2={VIEW_H}
              className="[stroke:var(--graph-line)]"
              strokeWidth={1}
              strokeOpacity={0.04}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            className="[stroke:var(--graph-line)]"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {active !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2 border-l border-dashed border-muted-foreground/50 transition-[left] duration-100 ease-out motion-reduce:transition-none"
            style={{ left: `${point.x}%` }}
          />
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute size-2 rounded-full bg-[var(--graph-line-dot)] transition-[left,top] duration-100 ease-out motion-reduce:transition-none"
          style={{
            left: `${point.x}%`,
            top: `${(point.y / VIEW_H) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      <p
        aria-hidden="true"
        className="mt-3 mb-1 flex h-5 justify-between text-sm font-medium tabular-nums text-nav-foreground"
      >
        <span>{formatDate(at[shown])}</span>
        <span>
          {points[shown]} {openCountLabel(points[shown]!)}
        </span>
      </p>
    </>
  );
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function FlowBars({ weeks }: { weeks: WeekFlow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.flatMap((w) => [w.opened, w.resolved]));
  const shown = weeks[active ?? weeks.length - 1]!;
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <>
      <div aria-hidden="true" className="mb-2 flex items-center gap-3 text-xs text-nav-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] [background:var(--graph-line)]" />
          Novi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] [background:var(--graph-fill)]" />
          Rešeni
        </span>
      </div>

      <div
        className="relative"
        role="img"
        aria-label={`Novi in rešeni zahtevki, zadnji ${FLOW_WEEKS} tedni: ${weeks
          .map((w) => `teden od ${shortDay(w.start)}: novi ${w.opened}, rešeni ${w.resolved}`)
          .join("; ")}`}
        onPointerLeave={() => setActive(null)}
      >
        <div aria-hidden="true" className="grid grid-cols-[auto_1fr] items-center gap-x-2">
          {weeks.map((w, i) => (
            <div
              key={w.start}
              className={cn(
                "col-span-2 grid grid-cols-subgrid items-center py-1 transition-opacity duration-150",
                active !== null && active !== i && "opacity-40",
              )}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
            >
              <span className="text-xs tabular-nums text-foreground-faint">{shortDay(w.start)}</span>
              <div className="relative flex flex-col gap-0.5">
                {[0.25, 0.5, 0.75].map((q) => (
                  <span
                    key={q}
                    className="pointer-events-none absolute inset-y-[-4px] border-l border-dashed [border-color:color-mix(in_oklab,var(--graph-line)_12%,transparent)]"
                    style={{ left: `${q * 100}%` }}
                  />
                ))}
                <span
                  className="relative h-1.5 rounded-r-[3px] [background:var(--graph-line)]"
                  style={{ width: pct(w.opened), minWidth: w.opened ? 3 : 0 }}
                />
                <span
                  className="relative h-1.5 rounded-r-[3px] [background:var(--graph-fill)]"
                  style={{ width: pct(w.resolved), minWidth: w.resolved ? 3 : 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        aria-hidden="true"
        className="mt-2 mb-1 flex h-5 justify-between text-sm font-medium tabular-nums text-nav-foreground"
      >
        <span>od {shortDay(shown.start)}</span>
        <span>
          novi {shown.opened}
          <span className="ml-3">rešeni {shown.resolved}</span>
        </span>
      </p>
    </>
  );
}
