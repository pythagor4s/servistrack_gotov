"use client";

import { useEffect, useState } from "react";

export function useDeferred(on: boolean | undefined, ms: number) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!on) {
      setReady(false);
      return;
    }
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [on, ms]);
  return ready;
}
