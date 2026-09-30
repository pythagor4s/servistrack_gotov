"use client";

import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export function ThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const stored = user?.preferences.theme;

  useEffect(() => {
    if (!stored) return;
    setTheme(stored === "LIGHT" ? "light" : "dark");
  }, [stored, setTheme]);

  return null;
}
