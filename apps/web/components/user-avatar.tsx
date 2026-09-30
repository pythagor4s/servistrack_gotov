"use client";

import { User } from "@/components/icons";

import { cn } from "@/lib/utils";

export function userImageSrc(user: { id: string; imageUpdatedAt?: string | null }): string {
  return `/api/users/${user.id}/image?v=${user.imageUpdatedAt ?? ""}`;
}

export function UserAvatar({
  user,
  className,
  iconClassName,
  eager = false,
}: {
  user: {
    id: string;
    name?: string | null;
    username: string;
    hasImage?: boolean;
    imageUpdatedAt?: string | null;
  };
  className?: string;
  iconClassName?: string;
  eager?: boolean;
}) {
  const shared = cn("shrink-0 overflow-hidden rounded-full", className);

  if (user.hasImage) {
    return (
      <img
        src={userImageSrc(user)}
        alt={user.name ?? user.username}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn(shared, "object-cover")}
      />
    );
  }

  return (
    <div
      className={cn(shared, "flex items-center justify-center [background-image:var(--avatar-disc)]")}
    >
      <User className={cn("size-5 text-avatar-disc-foreground", iconClassName)} />
    </div>
  );
}
