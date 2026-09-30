import { cn } from "@/lib/utils";

export function RelevanceMeter({
  value,
  label = "Ujemanje",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const filled = value >= 80 ? 4 : value >= 55 ? 3 : value >= 30 ? 2 : 1;
  return (
    <span
      role="img"
      aria-label={`${label} ${value} %`}
      title={`${label} ${value} %`}
      className={cn("inline-flex h-3 items-end gap-[2px]", className)}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", i < filled ? "bg-foreground" : "bg-border")}
          style={{ height: `${40 + i * 20}%` }}
        />
      ))}
    </span>
  );
}

export function ShareBar({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-inset", className)}>
      <span
        className="block h-full rounded-full bg-foreground transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </span>
  );
}
