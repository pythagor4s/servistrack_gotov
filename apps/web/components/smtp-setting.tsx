"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { SettingRow } from "@/components/detail-parts";
import { Button } from "@/components/ui/button";

type EmailStatus = {
  configured: boolean;
  host: string | null;
  port: number | null;
  from: string | null;
  ok: boolean;
  error: string | null;
};

export function SmtpSetting() {
  const { data, refetch } = useApi<EmailStatus>("/settings/email");
  const [sending, setSending] = useState(false);

  const hint = !data
    ? "Preverjam povezavo s poštnim strežnikom…"
    : !data.configured
      ? "Poštni strežnik ni nastavljen (SMTP_HOST) - e-pošta se ne pošilja."
      : data.ok
        ? `${data.host}:${data.port} · pošiljatelj ${data.from}`
        : `${data.host}:${data.port} se ne odziva pravilno: ${data.error}`;

  async function sendTest() {
    setSending(true);
    try {
      const r = await apiPost<{ to: string; ok: boolean; error?: string }>("/settings/email/test", {});
      if (r.ok) toast.success(`Preizkusna e-pošta poslana na ${r.to}`);
      else toast.error(`Pošiljanje ni uspelo: ${r.error ?? "neznana napaka"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pošiljanje ni uspelo");
    } finally {
      setSending(false);
      void refetch();
    }
  }

  return (
    <SettingRow title="Poštni strežnik" hint={<span className={data && data.configured && !data.ok ? "text-destructive" : undefined}>{hint}</span>}>
      <Button size="sm" variant="outline" className="bg-transparent" disabled={!data?.configured || sending} onClick={sendTest}>
        Pošlji preizkusno
      </Button>
    </SettingRow>
  );
}
