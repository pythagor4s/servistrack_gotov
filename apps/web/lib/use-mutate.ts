"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ApiError } from "./api";

export function useMutate(refresh: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);

  async function run(
    fn: () => Promise<unknown>,
    ok: string,
    opts?: Parameters<typeof toast.success>[1],
  ) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(ok, opts);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Dejanje ni uspelo");
    } finally {
      setBusy(false);
    }
  }

  return { run, busy };
}
