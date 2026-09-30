"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListView } from "@servis-track/shared";

import { apiPatch } from "./api";
import { useAuth } from "./auth";

export type ListPage = "tickets" | "machines" | "servicers" | "users";

const STORAGE_KEY: Record<ListPage, string> = {
  tickets: "servis-track:tickets-view",
  machines: "servis-track:machines-view",
  servicers: "servis-track:servicers-view",
  users: "servis-track:users-view",
};

const PREF_FIELD: Record<ListPage, "viewTickets" | "viewMachines" | "viewServicers" | "viewUsers"> =
  {
    tickets: "viewTickets",
    machines: "viewMachines",
    servicers: "viewServicers",
    users: "viewUsers",
  };

const DEFAULT_VIEW: Record<ListPage, ListView> = {
  tickets: "TABLE",
  machines: "CARDS",
  servicers: "TABLE",
  users: "TABLE",
};

function parseStored(raw: string | null): ListView | null {
  if (raw === "CARDS" || raw === "cards") return "CARDS";
  if (raw === "TABLE" || raw === "table") return "TABLE";
  return null;
}

export function useListView(page: ListPage): {
  view: ListView;
  chooseView: (next: ListView) => void;
} {
  const { user, applyPreferences } = useAuth();
  const fromDb = user?.preferences[PREF_FIELD[page]];

  const [view, setView] = useState<ListView>(() => fromDb ?? DEFAULT_VIEW[page]);

  useEffect(() => {
    if (fromDb) return;
    const saved = parseStored(window.localStorage.getItem(STORAGE_KEY[page]));
    if (saved) setView(saved);
  }, [fromDb, page]);

  useEffect(() => {
    if (!fromDb) return;
    setView(fromDb);
    window.localStorage.setItem(STORAGE_KEY[page], fromDb);
  }, [fromDb, page]);

  const chooseView = useCallback(
    (next: ListView) => {
      setView(next);
      window.localStorage.setItem(STORAGE_KEY[page], next);
      applyPreferences({ [PREF_FIELD[page]]: next });
      void apiPatch("/auth/me/preferences", { [PREF_FIELD[page]]: next }).catch(() => {});
    },
    [page, applyPreferences],
  );

  return { view, chooseView };
}
