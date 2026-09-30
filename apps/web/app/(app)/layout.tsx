"use client";

import {
  Fragment,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "@/components/icons";
import { DevicePrefsEffects } from "@/components/device-prefs-effects";
import {
  AnimatedBookOpenTextIcon,
  AnimatedClipboardListIcon,
  AnimatedDashboardIcon,
  AnimatedBriefcaseIcon,
  AnimatedScanBoxIcon,
  AnimatedTagsIcon,
  AnimatedUsersIcon,
  AnimatedWrenchIcon,
  AnimatedSettingsIcon,
  MotionFeatures,
  type NavIconProps,
} from "@/components/nav-icons";
import { useAuth } from "@/lib/auth";
import { prefetch } from "@/lib/useApi";
import { Loader } from "@/components/loader";
import { Separator } from "@/components/ui/separator";
import {
  POPOVER_LIST,
  POPOVER_ROW,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MobileActionBar, MobileBarProvider } from "@/components/mobile-action-bar";
import { SidebarBacklog } from "@/components/sidebar-backlog";
import { SidebarAgenda } from "@/components/sidebar-agenda";
import { SidebarSection } from "@/components/sidebar-section";
import { ThemeSync } from "@/components/theme-sync";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
} from "@/components/hover-tint";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<NavIconProps>;
  adminOnly?: boolean;
  groupStart?: boolean;
  prefetch: string[];
};

const NAV: NavItem[] = [
  { href: "/nadzorna-plosca", label: "Nadzorna plošča", icon: AnimatedDashboardIcon, prefetch: ["/knowledge"] },
  { href: "/zahtevki", label: "Ticketi", icon: AnimatedTagsIcon, prefetch: ["/departments", "/machines"] },
  {
    href: "/znanje",
    label: "Baza znanja",
    icon: AnimatedBookOpenTextIcon,
    prefetch: ["/fault-categories", "/machines", "/knowledge/search?sort=views&limit=5"],
  },
  { href: "/opravila", label: "Opravila", icon: AnimatedClipboardListIcon, adminOnly: true, prefetch: ["/calendar/categories", "/machines"] },
  { href: "/sredstva", label: "Sredstva", icon: AnimatedBriefcaseIcon, adminOnly: true, groupStart: true, prefetch: ["/machines", "/departments", "/machine-types"] },
  { href: "/serviserji", label: "Serviserji", icon: AnimatedWrenchIcon, adminOnly: true, prefetch: ["/servicers"] },
  { href: "/uporabniki", label: "Uporabniki", icon: AnimatedUsersIcon, adminOnly: true, groupStart: true, prefetch: ["/users"] },
  { href: "/sifranti", label: "Šifranti", icon: AnimatedScanBoxIcon, adminOnly: true, prefetch: ["/machine-types", "/departments"] },
];

function navRow(active: boolean) {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
    active ? "text-primary" : "text-nav-foreground hover:text-foreground",
  );
}

function NavLinks({
  items,
  onNavigate,
  className,
  separators = true,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className?: string;
  separators?: boolean;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <MotionFeatures>
      <nav
        className={cn("flex-1 select-none space-y-1 overflow-y-auto px-2 py-2", className)}
      >
        {items.map((item, i) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const warm = () => item.prefetch.forEach(prefetch);
          const divider = separators && item.groupStart && i > 0;
          return (
            <Fragment key={item.href}>
              {divider && (
                <div className="mx-2 my-2">
                  <Separator />
                </div>
              )}
              <Link
                href={item.href}
                onPointerEnter={(e) => {
                  warm();
                  if (e.pointerType === "mouse") setHovered(item.href);
                }}
                onPointerLeave={(e) => {
                  setHovered((h) => (h === item.href ? null : h));
                  onTintCursorLeave(e);
                }}
                onFocus={warm}
                onClick={onNavigate}
                data-tint=""
                aria-current={active ? "page" : undefined}
                onPointerMove={onTintCursorMovePlate}
                className={navRow(active)}
              >
                <Icon className="size-5" animate={!active && hovered === item.href} />
                {item.label}
              </Link>
            </Fragment>
          );
        })}
      </nav>
    </MotionFeatures>

  );
}

const FOOTER_LINKS = [
  { href: "/nastavitve", label: "Nastavitve", icon: AnimatedSettingsIcon },
] as const;

function SidebarFooterLinks() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <MotionFeatures>
      <nav aria-label="Nastavitve" className="select-none space-y-1 px-2">
        <div className="-mt-3 mx-3 mb-3">
          <Separator />
        </div>
        {FOOTER_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-tint=""
              aria-current={active ? "page" : undefined}
              onPointerMove={onTintCursorMovePlate}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setHovered(href);
              }}
              onPointerLeave={(e) => {
                setHovered((h) => (h === href ? null : h));
                onTintCursorLeave(e);
              }}
              className={navRow(active)}
            >
              <Icon className="size-5 shrink-0" animate={!active && hovered === href} />
              {label}
            </Link>
          );
        })}
      </nav>
    </MotionFeatures>
  );
}

function UserMenuChevrons({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m8 7 4-4 4 4" />
      <path d="m8 17 4 4 4-4" />
    </svg>
  );
}

function UserBlock() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="px-2 select-none">
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-tint=""
              onPointerMove={onTintCursorMovePlate}
              onPointerLeave={onTintCursorLeave}
              className="group flex w-full items-center gap-3 rounded-md p-2 text-left"
            >
              <UserAvatar user={user} className="size-9 rounded-lg" eager />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name ?? user.username}</p>
                {user.email && <p className="truncate text-xs text-nav-foreground">{user.email}</p>}
              </div>
              <UserMenuChevrons className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={4}
            className={cn("w-[var(--radix-popover-trigger-width)] p-1", POPOVER_LIST)}
          >
            <ThemeToggle />
            <div className="mx-2">
              <Separator />
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              data-tint=""
              onPointerMove={onTintCursorMovePlate}
              onPointerLeave={onTintCursorLeave}
              className={cn(POPOVER_ROW, "hover:bg-transparent")}
            >
              <LogOut className="size-4 shrink-0" /> Odjava
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const here = window.location.pathname + window.location.search;
      router.replace(here === "/" || here === "/nadzorna-plosca" ? "/prijava" : `/prijava?next=${encodeURIComponent(here)}`);
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="size-10 text-wordmark animate-loader-appear" />
      </div>
    );
  }
  if (!user) return null;

  const items = NAV.filter((item) => !item.adminOnly || isAdmin);
  const mobileItems: NavItem[] = [
    ...items,
    ...FOOTER_LINKS.map((l, i) => ({ href: l.href, label: l.label, icon: l.icon, groupStart: i === 0, prefetch: [] })),
  ];
  const current = mobileItems.find((item) => pathname.startsWith(item.href));

  return (
    <MobileBarProvider>
    <div className="flex min-h-dvh bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] lg:h-dvh lg:overflow-hidden">
      <ThemeSync />
      <aside className="hidden w-66 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex flex-col gap-4 pt-3">
          <UserBlock />
        </div>
        <div className="mx-4 mt-3">
          <Separator />
        </div>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-3">
          <SidebarSection label="Pregled" labelClassName="px-5">
            <NavLinks items={items} className="flex-none overflow-visible py-0" />
          </SidebarSection>
          <SidebarAgenda />
        </div>
        <div className="flex shrink-0 flex-col gap-6 pt-3 pb-3">
          <SidebarBacklog />
          <SidebarFooterLinks />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="scroll-fade relative isolate flex-1 overflow-x-hidden p-3 pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:overflow-y-auto lg:px-5 lg:pb-3">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-linear-to-b from-page-glow to-transparent"
          />
          <DevicePrefsEffects />
          <MotionFeatures>
            <div className="mx-auto max-w-[100rem] lg:flex lg:min-h-full lg:flex-col">{children}</div>
          </MotionFeatures>
        </main>
      </div>

      <MobileActionBar
        label={current?.label ?? "ServisTrack"}
        icon={current?.icon}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <NavLinks
          items={mobileItems}
          onNavigate={() => setMenuOpen(false)}
          className="p-1 [&>a:first-child]:rounded-t-[1.25rem] [&>a:last-child]:rounded-b-[1.25rem]"
        />
      </MobileActionBar>
    </div>
    </MobileBarProvider>
  );
}
