import { z, type ZodType } from "zod";

export type FieldErrors = Record<string, string>;

z.config(z.locales.sl());

const SL_MESSAGES: Record<string, string> = {
  "at least one field must be provided": "Izpolniti je treba vsaj eno polje",
  "body is required": "Vsebina je obvezna",
  "brand is required": "Znamka je obvezna",
  "choose at least one channel": "Izbrati je treba vsaj en kanal",
  "date must be a working day (Monday to Friday)": "Izberite delovni dan (ponedeljek–petek)",
  "endMinute must be after startMinute": "Konec mora biti za začetkom",
  "must be a multiple of 15 minutes": "Čas mora biti v korakih po 15 minut",
  "must be a real calendar date (YYYY-MM-DD)": "Izberite dan",
  "recurrenceUntil must not be before date": "Konec ponavljanja ne sme biti pred prvim dnem",
  "recurrenceUntil needs a recurrenceUnit": "Konec ponavljanja zahteva ponavljanje",
  "startMinute and endMinute go together (both, or neither for an all-day task)":
    "Izberite začetek in konec ali označite cel dan",
  "model is required": "Model je obvezen",
  "name is required": "Naziv je obvezen",
  "password is required": "Geslo je obvezno",
  "password must be at least 8 characters": "Geslo mora imeti vsaj 8 znakov",
  "phone may use only digits, spaces and + ( ) - .":
    "Telefon lahko vsebuje samo števke, presledke in + ( ) - .",
  "resolution is required": "Rešitev je obvezna",
  "title is required": "Naslov je obvezen",
  "username is required": "Uporabniško ime je obvezno",
  "username may use only a-z, 0-9, . _ -":
    "Uporabniško ime lahko vsebuje samo a-z, 0-9, . _ -",
  "username must be at least 3 characters": "Uporabniško ime mora imeti vsaj 3 znake",
};

export function validateForm<T>(
  schema: ZodType<T>,
  values: unknown,
): { ok: true; data: T } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    errors[key] ??= SL_MESSAGES[issue.message] ?? issue.message;
  }
  return { ok: false, errors };
}
