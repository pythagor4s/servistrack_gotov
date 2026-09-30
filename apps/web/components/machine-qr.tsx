"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { cn } from "@/lib/utils";

const QUIET = 4;

export function MachineQr({ value, className, label }: { value: string; className?: string; label: string }) {
  const { size, d } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) path += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
      }
    }
    return { size: n + QUIET * 2, d: path };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn("block", className)}
    >
      <rect width={size} height={size} className="fill-qr-paper" />
      <path d={d} className="fill-qr-ink" />
    </svg>
  );
}

export function machineReportUrl(machineId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
  return `${base}/zahtevki?new=1&newMachineId=${encodeURIComponent(machineId)}`;
}
