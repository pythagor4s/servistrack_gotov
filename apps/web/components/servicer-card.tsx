"use client";

import { CircleDot, Layers, Mail, MapPin, Shapes, Wrench } from "@/components/icons";

import { CopyableValue } from "@/components/copyable";
import { PhoneNumber } from "@/components/phone-number";
import {
  ProfileCard,
  ProfileCardEditButton,
  ProfileCardFooter,
  ProfileCardIdentity,
  ProfileCardSkeleton,
} from "@/components/profile-card";
import { ticketCountLabel } from "@/lib/format";
import { servicerArt } from "@/lib/servicer-art";
import type { Servicer } from "@/lib/types";

export function ServicerCard({
  servicer: s,
  onEdit,
}: {
  servicer: Servicer;
  onEdit: () => void;
}) {
  const n = s._count?.tickets ?? 0;
  const art = servicerArt(s.id);
  return (
    <ProfileCard>
      <div className="flex flex-1 flex-col px-2 pb-1">
        <ProfileCardIdentity
          avatar={
            art ? (
              <img
                src={art.logo}
                alt=""
                draggable={false}
                className="size-16 rounded-full select-none dark:brightness-[0.9]"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-muted text-nav-foreground">
                <Wrench className="size-7" />
              </span>
            )
          }
          name={s.name}
        />
        <div className="mt-3 space-y-1.5 text-sm">
          <p className="flex min-w-0 items-center gap-1.5 font-medium text-nav-foreground">
            <Shapes className="size-4 shrink-0" />
            <span className="truncate">{s.specialty ?? "Področje ni vpisano"}</span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 font-medium text-nav-foreground tabular-nums">
            <Layers className="size-4 shrink-0" />
            {n} {ticketCountLabel(n)}
          </p>
          <div>
            <CopyableValue value={s.email} icon={Mail} copiedLabel="E-pošta kopirana" toastId="copy-email" />
          </div>
          <div>
            <PhoneNumber phone={s.phone} className="text-sm" />
          </div>
          <div>
            <CopyableValue
              value={s.address}
              icon={MapPin}
              copiedLabel="Naslov kopiran"
              toastId="copy-address"
              empty={<span className="text-nav-foreground italic">Naslov ni vpisan.</span>}
            />
          </div>
        </div>
        <ProfileCardFooter
          status={
            <>
              <CircleDot className="size-4 shrink-0" />
              {s.active ? "Aktiven" : "Neaktiven"}
            </>
          }
          action={<ProfileCardEditButton onEdit={onEdit} />}
        />
      </div>
    </ProfileCard>
  );
}

export function ServicerCardSkeleton() {
  return <ProfileCardSkeleton rows={4} />;
}
