"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Eye, EyeOff, Lock, User } from "@/components/icons";
import { loginSchema } from "@servis-track/shared";
import { apiPost, ApiError } from "@/lib/api";
import { validateForm, type FieldErrors } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/loader";
import { Wordmark } from "@/components/wordmark";
import { Credits } from "@/components/credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconAction } from "@/components/ui/tooltip";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_FIELD,
} from "@/components/hover-tint";
import { cn, safeNextPath } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entered, setEntered] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  useEffect(() => {
    if (user) router.replace(safeNextPath(window.location.search));
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = validateForm(loginSchema, { username, password });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await apiPost("/auth/login", parsed.data);
      setEntered(true);
      await refresh();
      router.push(safeNextPath(window.location.search));
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Prijava ni uspela, poskusite znova.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate min-h-dvh bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-linear-to-b from-page-glow to-transparent"
      />
      <section className="flex min-h-dvh flex-col px-6 py-10 sm:px-10">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[26rem]">
            <h1 className="sr-only">Prijava v ServisTrack</h1>
            <div className="flex flex-col items-center text-center">
              <div className="flex flex-col items-center gap-3">
                <Wordmark className="text-[2.75rem]" />
                <span className="flex items-center gap-2.5 text-[0.8125rem] font-semibold tracking-[0.18em] text-nav-foreground uppercase">
                  <span aria-hidden className="flex gap-1">
                    <span className="size-2.5 rounded-[2px] bg-print-cyan" />
                    <span className="size-2.5 rounded-[2px] bg-print-magenta" />
                    <span className="size-2.5 rounded-[2px] bg-print-yellow" />
                    <span className="size-2.5 rounded-[2px] bg-print-key ring-1 ring-border" />
                  </span>
                  Servis in vzdrževanje
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate className="mt-10 space-y-5">

              <div className="space-y-2">
                <Label htmlFor="username">Uporabniško ime</Label>
                <div
                  className={cn("relative rounded-xl", TINT_SHAPE_FIELD)}
                  data-tint=""
                  onPointerMove={onTintCursorMovePlate}
                  onPointerLeave={onTintCursorLeave}
                >
                  <User className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="uporabniško ime"
                    tint={false}
                    className={FIELD}
                    value={username}
                    aria-invalid={!!errors.username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Geslo</Label>
                <div
                  className={cn("relative rounded-xl", TINT_SHAPE_FIELD)}
                  data-tint=""
                  onPointerMove={onTintCursorMovePlate}
                  onPointerLeave={onTintCursorLeave}
                >
                  <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    tint={false}
                    className={cn(FIELD, "pr-12")}
                    value={password}
                    aria-invalid={!!errors.password}
                    aria-describedby={capsLock ? "caps-lock" : undefined}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                  />
                  <IconAction label={showPassword ? "Skrij geslo" : "Pokaži geslo"}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Skrij geslo" : "Pokaži geslo"}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </IconAction>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                {capsLock && (
                  <p id="caps-lock" className="flex items-center gap-1.5 text-sm text-nav-foreground">
                    <ChevronUp className="size-4" /> Caps Lock je vklopljen.
                  </p>
                )}
              </div>

              {serverError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" className="mt-3 h-12 w-full rounded-xl text-base" disabled={submitting || entered}>
                {submitting || entered ? (
                  <>
                    <Loader className="size-5" label="" />
                    Prijavljanje…
                  </>
                ) : (
                  "Prijava"
                )}
              </Button>
            </form>
          </div>
        </div>

        <footer className="mx-auto mt-12 flex w-full max-w-[26rem] flex-col items-center text-center">
          <Credits />
        </footer>
      </section>

    </main>
  );
}

const FIELD = "h-12 rounded-xl pl-12 text-base md:text-base";
