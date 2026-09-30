"use client";

import { useEffect } from "react";

import { useDevicePrefs } from "@/lib/device-prefs";

export function DevicePrefsEffects() {
  const { cardTint, reduceMotion } = useDevicePrefs();
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.cardTint = cardTint;
    html.dataset.reduceMotion = String(reduceMotion);
  }, [cardTint, reduceMotion]);
  return null;
}
