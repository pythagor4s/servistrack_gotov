"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ListView } from "@servis-track/shared";

import { Mail, Network, Phone } from "@/components/icons";
import { apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useListView, type ListPage } from "@/lib/view-preference";
import {
  CALENDAR_VIEW_KEY,
  CALENDAR_VIEWS,
  type CalendarView,
} from "@/lib/calendar";
import { UserAvatar } from "@/components/user-avatar";
import { Switch } from "@/components/ui/switch";
import { setDevicePref, useDevicePrefs, type DevicePrefs } from "@/lib/device-prefs";
import { CALENDAR_DAY_END, CALENDAR_DAY_START } from "@servis-track/shared";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { PanelRow, SectionTitle, SettingRow } from "@/components/detail-parts";
import { SmtpSetting } from "@/components/smtp-setting";

const FIELD = "w-40 bg-transparent";

const THEME_OPTIONS: ComboboxOption[] = [
  { value: "dark", label: "Temna" },
  { value: "light", label: "Svetla" },
];

const VIEW_OPTIONS: ComboboxOption[] = [
  { value: "TABLE", label: "Tabela" },
  { value: "CARDS", label: "Kartice" },
];

const PAGE_SIZE_OPTIONS: ComboboxOption[] = [
  { value: "10", label: "10 vrstic" },
  { value: "20", label: "20 vrstic" },
  { value: "50", label: "50 vrstic" },
];

const TICKET_STATUS_OPTIONS: ComboboxOption[] = [
  { value: "all", label: "Vsa stanja" },
  { value: "OPEN", label: "Odprt" },
  { value: "IN_PROGRESS", label: "V teku" },
  { value: "SERVICER_COMING", label: "Serviser prihaja" },
  { value: "RESOLVED", label: "Rešen" },
];

const CARD_TINT_OPTIONS: ComboboxOption[] = [
  { value: "dark", label: "V temni temi" },
  { value: "off", label: "Izklopljen" },
];

const HOUR_OPTIONS: ComboboxOption[] = Array.from(
  { length: (CALENDAR_DAY_END - CALENDAR_DAY_START) / 60 + 1 },
  (_, i) => {
    const m = CALENDAR_DAY_START + i * 60;
    return { value: String(m), label: `${String(m / 60).padStart(2, "0")}:00` };
  },
);

const DEVICE = "Na tej napravi.";

const CALENDAR_VIEW_OPTIONS: ComboboxOption[] = [
  { value: "week", label: "Teden" },
  { value: "month", label: "Mesec" },
  { value: "day", label: "Dan" },
  { value: "list", label: "Seznam" },
];

export default function SettingsPage() {
  const { user, isAdmin, applyPreferences } = useAuth();
  const { theme, setTheme } = useTheme();
  const device = useDevicePrefs();

  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CALENDAR_VIEW_KEY) as CalendarView | null;
      if (saved && CALENDAR_VIEWS.includes(saved)) setCalendarView(saved);
    } catch {
    }
  }, []);

  function chooseTheme(next: string) {
    const t = next === "light" ? "light" : "dark";
    setTheme(t);
    const pref = t === "light" ? "LIGHT" : "DARK";
    applyPreferences({ theme: pref });
    void apiPatch("/auth/me/preferences", { theme: pref }).catch(() => {});
  }

  function chooseCalendarView(next: string) {
    const v = next as CalendarView;
    setCalendarView(v);
    try {
      window.localStorage.setItem(CALENDAR_VIEW_KEY, v);
    } catch {
    }
  }

  if (!user) return null;
  const displayName = user.name ?? user.username;

  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-8">
          <section className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
            <SectionTitle
              action={
                isAdmin && (
                  <Link
                    href="/uporabniki"
                    className="text-sm text-nav-foreground transition-colors hover:text-foreground"
                  >
                    Uporabniki
                  </Link>
                )
              }
            >
              Račun
            </SectionTitle>
            <div className="flex items-center gap-3">
              <UserAvatar
                user={{
                  id: user.id,
                  name: user.name,
                  username: user.username,
                  hasImage: user.hasImage,
                  imageUpdatedAt: user.imageUpdatedAt,
                }}
                className="size-12"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{displayName}</p>
                <p className="truncate text-sm text-nav-foreground">
                  @{user.username} · {user.role === "ADMIN" ? "Administrator" : "Delavec"}
                </p>
              </div>
            </div>
            <dl className="space-y-1">
              <PanelRow label="E-pošta" icon={Mail}>
                {user.email ?? "—"}
              </PanelRow>
              <PanelRow label="Telefon" icon={Phone}>
                {user.phone ?? "—"}
              </PanelRow>
              <PanelRow label="Oddelek" icon={Network}>
                {user.department?.name ?? "—"}
              </PanelRow>
            </dl>
            <p className="text-sm text-nav-foreground">
              {isAdmin
                ? "Podatke, fotografijo in geslo urejate na strani Uporabniki."
                : "Podatke, fotografijo in geslo ureja administrator."}
            </p>
          </section>
  
          <section className="min-w-0 lg:col-start-1 lg:row-start-2">
            <SectionTitle line={false}>Seznami</SectionTitle>
            <div className="divide-y divide-border">
              <ViewRow page="tickets" title="Ticketi" />
              <ViewRow page="machines" title="Sredstva" />
              {isAdmin && <ViewRow page="servicers" title="Serviserji" />}
              {isAdmin && <ViewRow page="users" title="Uporabniki" />}
              <SettingRow title="Vrstic na stran" hint={`Velja za vse tabele. ${DEVICE}`}>
                <Combobox
                  value={String(device.pageSize)}
                  onChange={(v) => setDevicePref("pageSize", Number(v) as DevicePrefs["pageSize"])}
                  options={PAGE_SIZE_OPTIONS}
                  className={FIELD}
                />
              </SettingRow>
            </div>
          </section>

          <section className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
            <SectionTitle>Videz</SectionTitle>
            <div className="flex flex-1 flex-col justify-between [&>*:last-child]:pb-0">
              <SettingRow title="Tema" hint="Temna ali svetla; velja na vseh vaših napravah.">
                <Combobox value={theme} onChange={chooseTheme} options={THEME_OPTIONS} className={FIELD} />
              </SettingRow>
              <SettingRow
                title="Ton pod kazalcem"
                hint="Sivi ton na karticah v temni temi, ki sledi miški."
              >
                <Combobox
                  value={device.cardTint === "always" ? "dark" : device.cardTint}
                  onChange={(v) => setDevicePref("cardTint", v as DevicePrefs["cardTint"])}
                  options={CARD_TINT_OPTIONS}
                  className={FIELD}
                />
              </SettingRow>
              <SettingRow
                title="Zmanjšano gibanje"
                hint="Brez prehodov in animacij, ne glede na sistem."
              >
                <Switch
                  checked={device.reduceMotion}
                  onCheckedChange={(v) => setDevicePref("reduceMotion", v)}
                />
              </SettingRow>
            </div>
          </section>

          <section className="min-w-0 lg:col-start-2 lg:row-start-2">
            <SectionTitle line={false}>Ticketi in opravila</SectionTitle>
            <div className="divide-y divide-border">
              <SettingRow
                title="Privzeti filter stanja"
                hint={`Filter ob odprtju seznama. ${DEVICE}`}
              >
                <Combobox
                  value={device.ticketStatus}
                  onChange={(v) => setDevicePref("ticketStatus", v as DevicePrefs["ticketStatus"])}
                  options={TICKET_STATUS_OPTIONS}
                  className={FIELD}
                />
              </SettingRow>
              <SettingRow
                title="Zaključeni ticketi"
                hint={`Na dnu seznama, pod ločilom. ${DEVICE}`}
              >
                <Switch
                  checked={device.showResolved}
                  onCheckedChange={(v) => setDevicePref("showResolved", v)}
                />
              </SettingRow>
              <SettingRow
                title="Obvestila po e-pošti"
                hint={
                  user.email
                    ? isAdmin
                      ? `Nov ticket in komentarji prijaviteljev na ${user.email}.`
                      : `Sporočila skrbnika o vaših prijavah na ${user.email}.`
                    : "V profilu nimate e-pošte, zato obvestil ni kam poslati."
                }
              >
                <Switch
                  checked={user.email ? user.preferences.notifyEmail : false}
                  disabled={!user.email}
                  onCheckedChange={(v) => {
                    applyPreferences({ notifyEmail: v });
                    apiPatch("/auth/me/preferences", { notifyEmail: v })
                      .then(() => toast.success(v ? "E-poštna obvestila vklopljena" : "E-poštna obvestila izklopljena"))
                      .catch(() => {
                        applyPreferences({ notifyEmail: !v });
                        toast.error("Nastavitve ni bilo mogoče shraniti");
                      });
                  }}
                />
              </SettingRow>
              {isAdmin && <SmtpSetting />}
              {isAdmin && (
                <>
                  <SettingRow
                    title="Privzeti pogled plana"
                    hint="S čim se plan odpre na tej napravi."
                  >
                    <Combobox
                      value={calendarView}
                      onChange={chooseCalendarView}
                      options={CALENDAR_VIEW_OPTIONS}
                      className={FIELD}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Opravljena opravila"
                    hint={`Prikazana v koledarju plana. ${DEVICE}`}
                  >
                    <Switch
                      checked={device.showCompletedTasks}
                      onCheckedChange={(v) => setDevicePref("showCompletedTasks", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Delovni čas"
                    hint="Ure, ki jih pokažeta teden in dan."
                  >
                    <Combobox
                      value={String(device.dayStart)}
                      onChange={(v) => setDevicePref("dayStart", Math.min(Number(v), device.dayEnd - 60))}
                      options={HOUR_OPTIONS.slice(0, -1)}
                      className="w-24 bg-transparent"
                    />
                    <span className="text-sm text-nav-foreground">–</span>
                    <Combobox
                      value={String(device.dayEnd)}
                      onChange={(v) => setDevicePref("dayEnd", Math.max(Number(v), device.dayStart + 60))}
                      options={HOUR_OPTIONS.slice(1)}
                      className="w-24 bg-transparent"
                    />
                  </SettingRow>
                </>
              )}
            </div>
          </section>
      </div>
    </div>
  );
}

function ViewRow({ page, title }: { page: ListPage; title: string }) {
  const { view, chooseView } = useListView(page);
  return (
    <SettingRow title={title}>
      <Combobox
        value={view}
        onChange={(v) => chooseView(v as ListView)}
        options={VIEW_OPTIONS}
        className={FIELD}
      />
    </SettingRow>
  );
}
