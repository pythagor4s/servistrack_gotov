"use client";

import { useEffect, useState } from "react";
import { CALENDAR_DAY_END, CALENDAR_DAY_START } from "@servis-track/shared";

export type CardTint = "dark" | "always" | "off";
export type TicketStatusDefault = "all" | "OPEN" | "IN_PROGRESS" | "SERVICER_COMING" | "RESOLVED";

export type DevicePrefs = {
  pageSize: 10 | 20 | 50;
  dayStart: number;
  dayEnd: number;
  ticketStatus: TicketStatusDefault;
  showResolved: boolean;
  cardTint: CardTint;
  reduceMotion: boolean;
  showCompletedTasks: boolean;
};

export const DEVICE_DEFAULTS: DevicePrefs = {
  pageSize: 20,
  dayStart: CALENDAR_DAY_START,
  dayEnd: CALENDAR_DAY_END,
  ticketStatus: "all",
  showResolved: true,
  cardTint: "dark",
  reduceMotion: false,
  showCompletedTasks: true,
};

const KEY = "servis-track:device-prefs";
const EVENT = "servis-track:device-prefs";

function read(): DevicePrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEVICE_DEFAULTS, ...(JSON.parse(raw) as Partial<DevicePrefs>) } : DEVICE_DEFAULTS;
  } catch {
    return DEVICE_DEFAULTS;
  }
}

export function setDevicePref<K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]): void {
  const next = { ...read(), [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useDevicePrefs(): DevicePrefs {
  const [prefs, setPrefs] = useState<DevicePrefs>(DEVICE_DEFAULTS);
  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return prefs;
}
