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
import { useEffect, type ReactNode } from "react";
import { PageHeading } from "@home-economy/ui/layout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Månaden", href: "/", icon: CalendarRange },
  { label: "Lönekoll", href: "/salary", icon: WalletCards },
  { label: "Investeringar", href: "/investments", icon: TrendingUp },
  { label: "Balans", href: "/balance", icon: Landmark },
  { label: "Inställningar", href: "/settings", icon: Settings },
] as const;
const pageTitles: Record<string, string> = {
  "/": "Månaden",
  "/salary": "Lönekoll",
  "/investments": "Investeringar",
  "/balance": "Balans",
  "/settings": "Inställningar",
  "/history": "Historik och kommande ändringar",
  "/transfers": "Överföringar och värden",
};
function isActive(pathname: string, href: string) {
  if (href === "/") return ["/", "/history", "/transfers"].includes(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}
function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <header className="hidden border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-6 py-3 lg:px-8">
        <Link
          href="/"
          aria-label="Hemekonomi"
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sidebar-ring"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Hemekonomi</span>
        </Link>
        <nav
          aria-label="Huvudmeny"
          className="flex flex-wrap items-center gap-1"
        >
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
                isActive(pathname, href)
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
function MobileNavigation({ pathname }: { pathname: string }) {
  // Reserve the full bar height below content; while a keyboard is open the
  // focused form takes precedence over global destinations.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLElement &&
        focused.matches("input, textarea, select, [contenteditable=true]");
      const keyboard =
        viewport.scale === 1 &&
        editing &&
        window.innerHeight - viewport.height > 120;
      document.documentElement.toggleAttribute("data-keyboard-open", keyboard);
    };
    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);
  return (
    <nav
      aria-label="Mobilmeny"
      className="ui-mobile-navigation fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card px-0.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      {navigation.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(
            "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[11px] leading-tight focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
            isActive(pathname, href)
              ? "font-medium text-primary"
              : "text-muted-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
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
  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-card focus:p-3"
      >
        Till innehållet
      </a>
      <DesktopNavigation pathname={pathname} />
      <MobileNavigation pathname={pathname} />
      <main
        id="page-content"
        tabIndex={-1}
        className="mx-auto max-w-[1480px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
      >
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <PageHeading>{pageTitles[pathname] ?? "Hemekonomi"}</PageHeading>
            <Badge
              variant="secondary"
              className="max-w-full rounded-full break-words whitespace-normal"
            >
              {householdName}
            </Badge>
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
