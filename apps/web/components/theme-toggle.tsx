"use client";

import { apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { AnimatedSunMoon } from "@/components/animated-sun-moon";
import { POPOVER_ROW } from "@/components/ui/popover";
import { onTintCursorLeave, onTintCursorMovePlate } from "@/components/hover-tint";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { applyPreferences } = useAuth();
  const toLight = theme === "dark";

  function onClick() {
    const next = toLight ? "LIGHT" : "DARK";
    toggleTheme();
    applyPreferences({ theme: next });
    void apiPatch("/auth/me/preferences", { theme: next }).catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={toLight ? "Preklopi na svetlo temo" : "Preklopi na temno temo"}
      data-tint=""
      onPointerMove={onTintCursorMovePlate}
      onPointerLeave={onTintCursorLeave}
      className={cn(POPOVER_ROW, "hover:bg-transparent ")}
    >
      <AnimatedSunMoon phase={toLight ? "sun" : "moon"} className="size-4 shrink-0" />
      {toLight ? "Svetla tema" : "Temna tema"}
    </button>
  );
}
