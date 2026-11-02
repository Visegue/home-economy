"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { monthLabel } from "@/features/budget/model";
import { cn } from "@/lib/utils";
import {
  destination,
  pageTitles,
  sameDestination,
  type Destination,
} from "./navigation-state";

type Snapshot = Destination & { children: ReactNode };
type Intent = Destination & { id: number };
type Failure = { target: Intent; retry?: () => void };
type Navigation = {
  confirmed: Destination;
  intent: Intent | null;
  pending: boolean;
  failure: Failure | null;
  begin: (href: string, force?: boolean) => boolean;
  navigate: (href: string, force?: boolean) => void;
  commit: (page: Snapshot) => void;
  fail: (href: string, retry: () => void) => void;
  retry: () => void;
  snapshot: ReactNode;
};
const NavigationContext = createContext<Navigation | null>(null);
export function useNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation)
    throw new Error("Navigation requires its authenticated provider.");
  return navigation;
}

/** Session-local, one-page retention. No global or persistent household cache. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initial = destination(`${pathname}${params.size ? `?${params}` : ""}`);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const latest = useRef<Intent | null>(null);
  const serial = useRef(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const failed = useRef<Failure | null>(null);
  const confirmed = snapshot ?? initial;

  const begin = useCallback((href: string, force = false) => {
    const next = destination(href, snapshotRef.current?.month);
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || !(next.pathname in pageTitles))
      return false;
    if (!force && latest.current?.href === next.href && !failed.current)
      return false;
    if (!force && !latest.current && snapshotRef.current?.href === next.href) {
      failed.current = null;
      setFailure(null);
      return false;
    }
    const target = { ...next, id: ++serial.current };
    latest.current = target;
    failed.current = null;
    setFailure(null);
    if (!navigator.onLine) {
      const error = { target };
      latest.current = null;
      failed.current = error;
      setFailure(error);
      setIntent(null);
      return false;
    }
    setIntent(target);
    return true;
  }, []);
  useEffect(() => {
    const onPopState = () => {
      begin(`${window.location.pathname}${window.location.search}`, true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [begin]);
  const navigate = useCallback(
    (href: string, force = false) => {
      if (begin(href, force))
        startTransition(() => router.push(href, { scroll: false }));
    },
    [begin, router],
  );
  const commit = useCallback((page: Snapshot) => {
    if (latest.current && !sameDestination(latest.current, page)) return;
    snapshotRef.current = page;
    setSnapshot((previous) =>
      previous?.children === page.children && previous?.href === page.href
        ? previous
        : page,
    );
    if (latest.current) {
      latest.current = null;
      setIntent(null);
      failed.current = null;
      setFailure(null);
    }
  }, []);
  const fail = useCallback(
    (href: string, retry: () => void) => {
      const attempted = destination(href, latest.current?.month);
      const target = latest.current;
      if (!target || !sameDestination(target, attempted)) return;
      const error = { target, retry };
      latest.current = null;
      failed.current = error;
      setFailure(error);
      setIntent(null);
      // Restore the confirmed URL as well as its useful page. A subsequent write
      // must revalidate the month being shown, not the unsuccessful target.
      const previous = snapshotRef.current;
      if (previous && previous.href !== href)
        startTransition(() => {
          router.replace(previous.href, { scroll: false });
          // Search-param changes do not reset Next's error boundary. Restore it
          // on the confirmed route so subsequent writes receive fresh props.
          retry();
        });
    },
    [router],
  );
  const retry = useCallback(() => {
    const error = failed.current;
    if (!error || !begin(error.target.href, true)) return;
    startTransition(() => {
      router.push(error.target.href, { scroll: false });
      error.retry?.();
    });
  }, [begin, router]);

  return (
    <NavigationContext
      value={{
        confirmed,
        intent,
        pending: !!intent,
        failure,
        begin,
        navigate,
        commit,
        fail,
        retry,
        snapshot: snapshot?.children,
      }}
    >
      {children}
    </NavigationContext>
  );
}

export function NavigationLink({
  href,
  onNavigate,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { begin } = useNavigation();
  return (
    <Link
      {...props}
      href={href}
      onNavigate={(event) => {
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
          },
        });
        if (prevented || !begin(href)) event.preventDefault();
      }}
    />
  );
}

/** Captures the actual server page, not Next's mutable layout-router element. */
export function NavigationPage({
  pathname,
  month,
  children,
}: {
  pathname: string;
  month?: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const navigation = useNavigation();
  const href = `${pathname}${params.size ? `?${params}` : ""}`;
  const confirmedMonth = navigation.confirmed.month;
  const commit = navigation.commit;
  const page = useMemo(() => {
    const result = destination(href, month ?? confirmedMonth);
    if (month) result.month = month;
    return result;
  }, [href, month, confirmedMonth]);
  const obsolete =
    navigation.intent && !sameDestination(navigation.intent, page);
  useLayoutEffect(() => {
    if (!obsolete) commit({ ...page, children });
  }, [page, children, obsolete, commit]);
  return (
    <>{obsolete && navigation.snapshot ? navigation.snapshot : children}</>
  );
}

export function NavigationStatus({ month = false }: { month?: boolean }) {
  const { confirmed, intent, failure, retry } = useNavigation();
  const target = intent ?? failure?.target;
  const isMonth =
    target?.pathname === confirmed.pathname &&
    ["/", "/transfers"].includes(confirmed.pathname);
  const visible = target && month === isMonth;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
      )}
    >
      {visible ? (
        <output className="contents">
          {intent ? (
            <span className="flex items-center gap-2 font-medium text-primary">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
              />
              {isMonth
                ? `Byter till ${monthLabel(intent.month)}…`
                : `Öppnar ${pageTitles[intent.pathname]}…`}
            </span>
          ) : (
            <>
              <span className="text-destructive">
                {isMonth
                  ? `${monthLabel(target.month)} kunde inte laddas. ${monthLabel(confirmed.month)} visas fortfarande.`
                  : `${pageTitles[target.pathname]} kunde inte laddas. ${pageTitles[confirmed.pathname]} visas fortfarande.`}
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto min-h-11 gap-2 whitespace-normal"
                onClick={retry}
              >
                <RotateCcw aria-hidden="true" />
                <span>Försök igen</span>
              </Button>
            </>
          )}
        </output>
      ) : null}
    </div>
  );
}

export function NavigationError({ retry }: { retry: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { fail, snapshot, confirmed } = useNavigation();
  const href = `${pathname}${params.size ? `?${params}` : ""}`;
  useLayoutEffect(() => {
    fail(href, retry);
  }, [href, retry, fail]);
  if (snapshot) return <>{snapshot}</>;
  return (
    <section className="space-y-4" role="alert">
      <h2 className="text-lg font-semibold">Sidan kunde inte laddas</h2>
      <p>Försök igen när anslutningen fungerar.</p>
      <Button type="button" onClick={retry}>
        <RotateCcw aria-hidden="true" />
        <span>Försök igen</span>
      </Button>
      <span className="sr-only">{pageTitles[confirmed.pathname]}</span>
    </section>
  );
}
export function NavigationLoading() {
  const { snapshot } = useNavigation();
  if (snapshot) return <>{snapshot}</>;
  return (
    <output aria-label="Laddar sidan" className="block space-y-6">
      <Skeleton className="h-12 w-72 max-w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </output>
  );
}
export function NavigationSurface({
  children,
  monthly = false,
}: {
  children: ReactNode;
  monthly?: boolean;
}) {
  const { pending, intent, confirmed } = useNavigation();
  const blocked =
    pending && (monthly || intent?.pathname !== confirmed.pathname);
  return (
    <div
      aria-busy={blocked}
      inert={blocked || undefined}
      className={cn(blocked && "opacity-40")}
    >
      {children}
    </div>
  );
}
