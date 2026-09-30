"use client";

import { ChevronUp, LogOut } from "@/components/icons";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { MotionFeatures, type NavIconProps } from "@/components/nav-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import {
  POPOVER_LABEL,
  POPOVER_LIST,
  POPOVER_ROW,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SlotContext = createContext<{
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
} | null>(null);

export function MobileBarProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={{ slot, setSlot }}>{children}</SlotContext.Provider>;
}

export function MobileBarActions({ children }: { children: ReactNode }) {
  const ctx = useContext(SlotContext);
  if (!ctx?.slot) return null;
  return createPortal(children, ctx.slot);
}

const BAR_SURFACE =
  "bg-background [background-image:linear-gradient(var(--surface-raised),var(--surface-raised))]";

const BAR_SHADOW = "shadow-lg shadow-halo-medium";

const BAR_MOTION = "duration-[250ms] ease-in-out";

export function BarCircle({
  label,
  variant = "outline",
  badge,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  label: string;
  variant?: "primary" | "outline";
  badge?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
        BAR_SHADOW,
        "[&_svg]:size-5 [&_svg]:shrink-0",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : cn("border", BAR_SURFACE, "active:bg-surface-hover"),
        className,
      )}
      {...props}
    >
      {children}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[0.6875rem] leading-4 font-medium text-primary-foreground tabular-nums">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function MobileUserButton() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;
  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${user.name ?? user.username} – uporabniški meni`}
          className={cn(
            "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border",
            BAR_SURFACE,
            BAR_SHADOW,
          )}
        >
          <UserAvatar user={user} className="size-full" iconClassName="size-6" eager />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className={cn("w-auto min-w-44 p-1", POPOVER_LIST)}>
        <div className={POPOVER_LABEL}>Izgled</div>
        <div onClick={() => setMenuOpen(false)}>
          <ThemeToggle />
        </div>
        <div className="mx-2">
          <Separator />
        </div>
        <button type="button" onClick={() => void logout()} className={POPOVER_ROW}>
          <LogOut className="size-4 shrink-0" /> Odjava
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function MobileActionBar({
  label,
  icon: Icon,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  icon?: ComponentType<NavIconProps>;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
}) {
  const ctx = useContext(SlotContext);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const [w, setW] = useState<{ pill: number; open: number } | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const measure = () => {
      const pill = pillRef.current;
      const panel = panelRef.current;
      const labelEl = labelRef.current;
      if (!pill || !panel || !labelEl || openRef.current) return;

      const forcedPill = pill.style.width;
      const forcedPanel = panel.style.width;
      pill.style.width = "";
      panel.style.width = "";
      const pillBox = pill.getBoundingClientRect();
      const natural = pillBox.width;
      const tail = pillBox.right - labelEl.getBoundingClientRect().right;
      const panelNatural = panel.getBoundingClientRect().width;
      pill.style.width = forcedPill;
      panel.style.width = forcedPanel;

      const next = { pill: natural, open: Math.max(natural, panelNatural + tail) };
      setW((prev) =>
        prev && prev.pill === next.pill && prev.open === next.open ? prev : next,
      );
    };
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [label]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <MotionFeatures>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:hidden"
      >
        <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black_50%,transparent_85%)]" />
        <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_20%,transparent_60%)]" />
        <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/35 to-transparent" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-[calc(100svh-100lvh)] z-20 h-[calc(100lvh-100svh)] lg:hidden"
      >
        <div className="absolute inset-0 backdrop-blur-md" />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] lg:hidden">
        <div className="relative flex w-full items-center justify-center">
          <div className="pointer-events-auto absolute inset-y-0 left-0 flex items-center">
            <MobileUserButton />
          </div>

          <div className="relative flex flex-col items-center">
            <div
              ref={panelRef}
              style={w ? { width: w.open } : undefined}
              className={cn(
                "pointer-events-auto absolute bottom-full left-1/2 mb-2 w-max max-w-[calc(100vw-240px)] -translate-x-1/2 overflow-hidden rounded-3xl border",
                BAR_SURFACE,
                BAR_SHADOW,
                "transition-[opacity,transform,visibility]",
                BAR_MOTION,
                open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0",
              )}
            >
              {children}
            </div>

            <button
              ref={pillRef}
              type="button"
              onClick={() => onOpenChange(!open)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`${label} – odpri meni`}
              style={w ? { width: open ? w.open : w.pill } : undefined}
              className={cn(
                "pointer-events-auto flex h-12 max-w-[calc(100vw-240px)] items-center gap-2 rounded-full border pr-2.5 pl-4",
                BAR_SURFACE,
                BAR_SHADOW,
                "text-sm font-medium transition-[width,background-color] active:bg-surface-hover",
                BAR_MOTION,
              )}
            >
              {Icon && <Icon className="size-[1.125rem] shrink-0 text-muted-foreground" />}
              <span ref={labelRef} className="truncate">
                {label}
              </span>
              <Separator
                orientation="vertical"
                className={cn(
                  "ml-auto transition-opacity duration-100 ease-in-out data-[orientation=vertical]:h-6",
                  open ? "opacity-0" : "opacity-100",
                )}
              />
              <ChevronUp
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  BAR_MOTION,
                  open && "rotate-180",
                )}
              />
            </button>
          </div>

          <div
            ref={ctx?.setSlot}
            className="pointer-events-auto absolute inset-y-0 right-0 flex items-center gap-1"
          />
        </div>
      </div>
    </MotionFeatures>
  );
}
