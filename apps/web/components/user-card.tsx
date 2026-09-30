"use client";

import { CircleDot, Mail, Network, ShieldUser } from "@/components/icons";

import { CopyableValue } from "@/components/copyable";
import { PhoneNumber } from "@/components/phone-number";
import { UserAvatar } from "@/components/user-avatar";
import {
  ProfileCard,
  ProfileCardEditButton,
  ProfileCardFooter,
  ProfileCardIdentity,
  ProfileCardSkeleton,
} from "@/components/profile-card";
import type { AppUser } from "@/lib/types";

export function UserCard({
  user: u,
  canManage,
  onEdit,
}: {
  user: AppUser;
  canManage: boolean;
  onEdit: () => void;
}) {
  return (
    <ProfileCard>
      <div className="flex flex-1 flex-col px-2 pb-1">
        <ProfileCardIdentity
          avatar={
            <UserAvatar
              user={u}
              className="size-16 dark:brightness-[0.88] dark:saturate-[0.85]"
              iconClassName="size-7"
            />
          }
          name={u.name ?? u.username}
          sub={`@${u.username}`}
        />
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3 font-medium text-nav-foreground">
            <p className="flex min-w-0 items-center gap-1.5">
              <Network className="size-4 shrink-0" />
              <span className="truncate">{u.department?.name ?? "Brez oddelka"}</span>
            </p>
            <p className="flex shrink-0 items-center gap-1.5">
              <ShieldUser className="size-4 shrink-0" />
              <span className={u.role === "ADMIN" ? "text-foreground" : undefined}>
                {u.role === "ADMIN" ? "Administrator" : "Delavec"}
              </span>
            </p>
          </div>
          <div>
            <CopyableValue
              value={u.email}
              icon={Mail}
              copiedLabel="E-pošta kopirana"
              toastId="copy-email"
              empty={<span className="text-nav-foreground italic">E-pošta ni vpisana.</span>}
            />
          </div>
          <div>
            <PhoneNumber phone={u.phone} className="text-sm" />
          </div>
        </div>
        <ProfileCardFooter
          status={
            <>
              <CircleDot className="size-4 shrink-0" />
              {u.active ? "Aktiven" : "Deaktiviran"}
            </>
          }
          action={canManage ? <ProfileCardEditButton onEdit={onEdit} /> : undefined}
        />
      </div>
    </ProfileCard>
  );
}

export function UserCardSkeleton() {
  return <ProfileCardSkeleton rows={3} />;
}
