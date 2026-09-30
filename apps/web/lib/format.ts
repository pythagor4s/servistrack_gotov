const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return `${formatDate(value)}, ${formatTime(value)}`;
}

function plural(
  n: number,
  forms: { one: string; two: string; few: string; many: string },
): string {
  const r = Math.abs(n) % 100;
  if (r === 1) return forms.one;
  if (r === 2) return forms.two;
  if (r === 3 || r === 4) return forms.few;
  return forms.many;
}

export const ticketCountLabel = (n: number) =>
  plural(n, { one: "ticket", two: "ticketa", few: "ticketi", many: "ticketov" });

export const machineCountLabel = (n: number) =>
  plural(n, { one: "stroj", two: "stroja", few: "stroji", many: "strojev" });

export const attemptCountLabel = (n: number) =>
  plural(n, { one: "poskus", two: "poskusa", few: "poskusi", many: "poskusov" });

export const openCountLabel = (n: number) =>
  plural(n, { one: "odprt", two: "odprta", few: "odprti", many: "odprtih" });

export const dayCountLabel = (n: number) =>
  plural(n, { one: "dan", two: "dneva", few: "dnevi", many: "dni" });

export const taskCountLabel = (n: number) =>
  plural(n, { one: "opravilo", two: "opravili", few: "opravila", many: "opravil" });

export const hourCountLabel = (n: number) =>
  plural(n, { one: "ura", two: "uri", few: "ure", many: "ur" });

export function formatDuration(from: string, to?: string | null): string {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "manj kot uro";
  if (hours < 24) return `${hours} ${hourCountLabel(hours)}`;
  const days = Math.floor(hours / 24);
  return `${days} ${dayCountLabel(days)}`;
}

export function greeting(hour: number): string {
  if (hour < 10) return "Dobro jutro";
  if (hour < 18) return "Dober dan";
  return "Dober večer";
}

const EUR = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" });

export function formatEur(cents: number): string {
  return EUR.format(cents / 100);
}

export function parseEurToCents(raw: string): number | null | undefined {
  const t = raw.replace(/[\s€]/g, "");
  if (t === "") return null;
  const m = t.match(/^(\d{1,3}(?:[.,]?\d{3})*|\d+)(?:[.,](\d{1,2}))?$/);
  if (!m) return undefined;
  const whole = Number(m[1]!.replace(/[.,]/g, ""));
  const frac = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return whole * 100 + frac;
}
