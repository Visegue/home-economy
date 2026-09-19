"use client";

import {
  CalendarRange,
  CircleDollarSign,
  Landmark,
  Settings,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mainNavigation = [
  {
    label: "Månaden",
    href: "/",
    icon: CalendarRange,
  },
  {
    label: "Lönekoll",
    href: "/salary",
    icon: WalletCards,
  },
  {
    label: "Investeringar",
    href: "/investments",
    icon: TrendingUp,
  },
  {
    label: "Balans",
    href: "/balance",
    icon: Landmark,
  },
] as const;

const settingsNavigation = {
  label: "Inställningar",
  href: "/settings",
  icon: Settings,
} as const;

const allNavigation = [...mainNavigation, settingsNavigation];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname.startsWith(`${href}/`) || pathname === href;
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <Link href="/" className="flex items-center gap-3 px-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <CircleDollarSign className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold tracking-tight">Hemekonomi</span>
        </span>
      </Link>

      <nav aria-label="Huvudmeny" className="mt-10 space-y-1">
        {mainNavigation.map(({ label, href, icon: Icon }) => {
          const active = isActivePath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Kontomeny" className="mt-auto">
        <Link
          href={settingsNavigation.href}
          aria-current={
            isActivePath(pathname, settingsNavigation.href) ? "page" : undefined
          }
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            isActivePath(pathname, settingsNavigation.href)
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="size-4" aria-hidden="true" />
          {settingsNavigation.label}
        </Link>
      </nav>
    </aside>
  );
}

function MobileNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Mobilmeny"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/70 bg-card/95 px-1 py-2 backdrop-blur lg:hidden"
    >
      {allNavigation.map(({ label, href, icon: Icon }) => {
        const active = isActivePath(pathname, href);

        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] transition-colors",
              active ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  householdName,
  userName,
}: {
  children: ReactNode;
  householdName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const currentPage =
    allNavigation.find(({ href }) => isActivePath(pathname, href)) ??
    mainNavigation[0];

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64">
      <DesktopNavigation pathname={pathname} />
      <MobileNavigation pathname={pathname} />

      <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {currentPage.label}
              </h1>
              <Badge variant="secondary" className="rounded-full">
                {householdName}
              </Badge>
            </div>
          </div>
          <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline">
            {userName}
          </span>
        </header>

        {children}
      </main>
    </div>
  );
}
