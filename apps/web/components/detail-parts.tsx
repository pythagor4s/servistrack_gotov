"use client";

import { useState, type ReactNode } from "react";

import { ChevronDown, type IconComponent } from "@/components/icons";
import { cn } from "@/lib/utils";


export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function SectionTitle({
  children,
  action,
  line = true,
  bare = false,
}: {
  children: ReactNode;
  action?: ReactNode;
  line?: boolean;
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        bare ? "h-6" : "box-content h-8 border-b pb-2",
        !bare && (line ? "border-border" : "border-transparent"),
      )}
    >
      <h2 className="text-base font-semibold select-none">{children}</h2>
      {action}
    </div>
  );
}

export function PanelSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-border py-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-sm text-base font-semibold select-none"
      >
        {title}
        <ChevronDown
          className={cn(
            "size-4 text-nav-foreground transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
        />
      </button>
      <Collapse open={open}>
        <div className="pt-3">{children}</div>
      </Collapse>
    </section>
  );
}

export function PanelRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: IconComponent;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-7 grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
      <dt className="text-nav-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-nav-foreground" />}
        <span className="min-w-0 truncate">{children}</span>
      </dd>
    </div>
  );
}

export function EmptyNote({
  icon: Icon,
  title,
  children,
}: {
  icon?: IconComponent;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        {children && <p className="text-nav-foreground">{children}</p>}
      </div>
    </div>
  );
}

export function AssetFacts({ department, serial }: { department?: string | null; serial?: string | null }) {
  if (!department && !serial) return <span>Brez oddelka</span>;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
      {department && <span className="truncate">{department}</span>}
      {serial && <span className="shrink-0 tabular-nums">#{serial}</span>}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-nav-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="flex min-h-10.5 min-w-0 flex-col justify-center gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-sm text-nav-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function SubTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      <h3 className="text-sm font-semibold select-none">{children}</h3>
      {action}
    </div>
  );
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open || undefined}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
