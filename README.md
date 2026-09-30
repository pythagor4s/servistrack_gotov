# ServisTrack

Aplikacija za servisne zahtevke (tickete), bazo znanja, opravila vzdrževanja in sredstva (stroje).
Sestavljena je iz dveh delov: `apps/api` (Express + Prisma + PostgreSQL) in `apps/web` (Next.js).

## Kaj potrebujete

- Node.js 22 ali novejši
- pnpm (`npm install -g pnpm`)
- Docker (za bazo)

## Namestitev

Na Windowsu naj bo projekt v kratki poti (npr. `C:\projekti\servistrack`), sicer build zaradi
predolgih poti do paketov lahko ne uspe.

1. Namestite pakete:

   ```
   pnpm install
   ```

2. Zaženite bazo:

   ```
   docker compose up -d
   ```

3. Kopirajte `apps/api/.env.example` v `apps/api/.env` in `apps/web/.env.example` v `apps/web/.env.local`
   ter izpolnite vrednosti:

   - `DATABASE_URL` - za bazo iz dockerja: `postgresql://servis:servis@localhost:5433/servis_track`
   - `JWT_SECRET` - poljuben dolg naključen niz
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` - prvi skrbnik, s katerim se prijavite (geslo vsaj 8 znakov)
   - `APP_URL` - naslov aplikacije, npr. `http://localhost:3000`
   - `BACKEND_URL` (v `apps/web/.env.local`) - `http://localhost:4000`
   - `NEXT_PUBLIC_APP_URL` - naslov, na katerega kažejo QR nalepke na strojih (lahko ostane prazno)
   - `SMTP_*` in `MAIL_FROM` - samo, če želite pošiljati e-pošto (glej spodaj)

4. Ustvarite tabele in prvega skrbnika:

   ```
   pnpm --filter @servis-track/api prisma migrate deploy
   pnpm --filter @servis-track/api seed
   ```

5. Zaženite aplikacijo:

   ```
   pnpm dev
   ```

   Spletna stran je na `http://localhost:3000`, API na `http://localhost:4000`.
   Prijavite se s skrbnikom iz `.env`. Baza je prazna - v Šifrantih najprej dodajte oddelke in vrste
   sredstev, nato sredstva, serviserje in uporabnike, potem pa lahko začnete prijavljati tickete.

## Obvestila (e-pošta in SMS)

E-pošta in SMS v tej različici nista povezana. Aplikacija zna pošiljati e-pošto prek SMTP, ampak
jo je treba povezati s firminim poštnim strežnikom (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`). SMS ponudnik ni implementiran. To je odvisno od tega, ali
boste aplikacijo uporabljali in s katerim ponudnikom.

## Produkcija

Predlog: aplikacijo postavite na firmin strežnik in ne na zunanjo storitev (npr. Vercel), ker je
namenjena interni uporabi. Na strežniku potrebujete PostgreSQL, Node.js in pnpm:

```
pnpm install
pnpm build
pnpm --filter @servis-track/api start:prod
pnpm --filter @servis-track/web start
```

`start:prod` ob zagonu sam izvede migracije baze.

## Ostalo

- Testi: `pnpm test`
- Ključ za prijave iz DiTracka: `pnpm --filter @servis-track/api apikey create "DiTrack"`
