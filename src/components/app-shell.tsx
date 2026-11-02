"use client";

import {
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  History,
  ArrowRightLeft,
  Landmark,
  LoaderCircle,
  Settings,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { PageHeading } from "@home-economy/ui/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationLink,
  NavigationLoading,
  NavigationStatus,
  NavigationSurface,
  useNavigation,
} from "./navigation";
import { monthlyPaths, pageTitles } from "./navigation-state";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Lönekoll", href: "/salary", icon: WalletCards },
  { label: "Investeringar", href: "/investments", icon: TrendingUp },
  { label: "Balans", href: "/balance", icon: Landmark },
  { label: "Inställningar", href: "/settings", icon: Settings },
];
const monthly = [
  { href: "/", icon: CalendarRange },
  { href: "/transfers", icon: ArrowRightLeft },
  { href: "/history", icon: History },
];
const spinner = "size-4 shrink-0 animate-spin motion-reduce:animate-none";
function NavigationItems({ mobile = false }: { mobile?: boolean }) {
  const { confirmed, intent } = useNavigation();
  const month = intent?.month ?? confirmed.month;
  const itemClass = mobile
    ? "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] leading-tight focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    : "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring";
  function activeClass(active: boolean) {
    return mobile
      ? active
        ? "font-medium text-primary"
        : "text-muted-foreground"
      : active
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent/60";
  }
  const groupPending = !!intent && monthlyPaths.includes(intent.pathname);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label="Månadsöversikt"
            aria-current={
              monthlyPaths.includes(confirmed.pathname) ? "page" : undefined
            }
            className={cn(
              itemClass,
              "group h-auto whitespace-normal",
              activeClass(monthlyPaths.includes(confirmed.pathname)),
              groupPending && "ring-2 ring-ring",
            )}
          >
            <CalendarRange
              className={mobile ? "size-5 shrink-0" : "size-4 shrink-0"}
              aria-hidden="true"
            />
            <span className="inline-flex min-w-0 items-center gap-1">
              <span>
                Månads
                <wbr />
                översikt
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-3 shrink-0 group-data-[state=open]:rotate-180"
              />
            </span>
            {groupPending ? (
              <LoaderCircle
                aria-hidden="true"
                className={cn(
                  spinner,
                  mobile && "absolute top-1 right-1 size-3",
                )}
              />
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side={mobile ? "top" : "bottom"}
          sideOffset={12}
          className="max-w-[calc(100vw-1rem)] min-w-64"
        >
          {monthly.map(({ href, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild>
              <NavigationLink
                href={`${href}?month=${month}`}
                aria-current={confirmed.pathname === href ? "page" : undefined}
                className={cn(
                  "min-h-11 gap-2 whitespace-normal",
                  confirmed.pathname === href && "bg-accent font-medium",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{pageTitles[href]}</span>
                {intent?.pathname === href ? (
                  <LoaderCircle aria-hidden="true" className={spinner} />
                ) : null}
              </NavigationLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {navigation.map(({ label, href, icon: Icon }) => (
        <NavigationLink
          key={href}
          href={href}
          aria-current={confirmed.pathname === href ? "page" : undefined}
          className={cn(
            itemClass,
            activeClass(confirmed.pathname === href),
            intent?.pathname === href && "ring-2 ring-ring",
          )}
        >
          <Icon
            aria-hidden="true"
            className={mobile ? "size-5 shrink-0" : "size-4 shrink-0"}
          />
          <span>{label}</span>
          {intent?.pathname === href ? (
            <LoaderCircle
              aria-hidden="true"
              className={cn(spinner, mobile && "absolute top-1 right-1 size-3")}
            />
          ) : null}
        </NavigationLink>
      ))}
    </>
  );
}
function DesktopNavigation() {
  const { confirmed } = useNavigation();
  return (
    <header className="hidden border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-6 py-3 lg:px-8">
        <NavigationLink
          href={`/?month=${confirmed.month}`}
          aria-label="Hemekonomi"
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sidebar-ring"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Hemekonomi</span>
        </NavigationLink>
        <nav
          aria-label="Huvudmeny"
          className="flex flex-wrap items-center gap-1"
        >
          <NavigationItems />
        </nav>
      </div>
    </header>
  );
}
function MobileNavigation() {
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
      <NavigationItems mobile />
    </nav>
  );
}
export function AppShell({
  children,
  householdName,
}: {
  children: ReactNode;
  householdName: string;
}) {
  const { confirmed } = useNavigation();
  const heading = useRef<HTMLDivElement>(null);
  const previousPath = useRef(confirmed.pathname);
  useEffect(() => {
    if (previousPath.current !== confirmed.pathname) {
      previousPath.current = confirmed.pathname;
      heading.current
        ?.querySelector<HTMLElement>("h1")
        ?.focus({ preventScroll: true });
    }
  }, [confirmed.pathname]);
  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-card focus:p-3"
      >
        Till innehållet
      </a>
      <DesktopNavigation />
      <MobileNavigation />
      <main
        id="page-content"
        tabIndex={-1}
        className="mx-auto max-w-[1480px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
      >
        <header className="flex flex-wrap items-center gap-3" ref={heading}>
          <PageHeading tabIndex={-1}>
            {pageTitles[confirmed.pathname] ?? "Hemekonomi"}
          </PageHeading>
          <Badge
            variant="secondary"
            className="max-w-full rounded-full [overflow-wrap:anywhere] whitespace-normal"
          >
            {householdName}
          </Badge>
        </header>
        <NavigationStatus />
        <NavigationSurface>
          <Suspense fallback={<NavigationLoading />}>{children}</Suspense>
        </NavigationSurface>
      </main>
    </div>
  );
}
