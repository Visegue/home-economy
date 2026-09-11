import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserMenu } from "@/components/user-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatSek } from "@/lib/money";

import { CashFlowChart } from "./cash-flow-chart";
import {
  accounts,
  allocation,
  overview,
  planRows,
  timeline,
  upcoming,
} from "./dashboard-data";

const navigation = [
  { label: "Översikt", href: "/", icon: LayoutDashboard, active: true },
  { label: "Månadsplan", href: "/plan", icon: CalendarDays, active: false },
  {
    label: "Transaktioner",
    href: "/transactions",
    icon: ReceiptText,
    active: false,
  },
  {
    label: "Konton & lån",
    href: "/accounts",
    icon: Landmark,
    active: false,
  },
  { label: "Sparmål", href: "/goals", icon: Target, active: false },
  {
    label: "Investeringar",
    href: "/investments",
    icon: TrendingUp,
    active: false,
  },
] as const;

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <CircleDollarSign className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold tracking-tight">Hemekonomi</p>
          <p className="text-xs text-sidebar-foreground/60">
            Ett lugnare pengaflöde
          </p>
        </div>
      </div>

      <nav aria-label="Huvudmeny" className="mt-10 space-y-1">
        {navigation.map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
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
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles
              className="size-4 text-sidebar-primary"
              aria-hidden="true"
            />
            Augusti är 78 % planerad
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
            <div className="h-full w-[78%] rounded-full bg-sidebar-primary" />
          </div>
          <p className="mt-2 text-xs text-sidebar-foreground/60">
            Tre återkommande poster saknar kategori.
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:text-sidebar-foreground"
        >
          <Settings className="size-4" aria-hidden="true" />
          Inställningar
        </Link>
      </div>
    </aside>
  );
}

function MobileNavigation() {
  return (
    <nav
      aria-label="Mobilmeny"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/70 bg-card/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      {navigation.slice(0, 5).map(({ label, href, icon: Icon, active }) => (
        <Link
          href={href}
          key={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px]",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span>{label.split(" ")[0]}</span>
        </Link>
      ))}
    </nav>
  );
}

function MonthTimeline() {
  return (
    <Card className="overflow-visible">
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {timeline.map((item, index) => (
            <div
              key={item.label}
              className="flex min-w-0 flex-1 items-center last:flex-none"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "grid size-9 place-items-center rounded-full border text-xs font-semibold tabular-nums",
                    item.state === "done" &&
                      "border-chart-4 bg-chart-4 text-primary-foreground",
                    item.state === "current" &&
                      "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                    item.state === "upcoming" &&
                      "border-border bg-card text-muted-foreground",
                  )}
                >
                  {item.day}
                </div>
                <span className="absolute top-11 hidden text-[11px] whitespace-nowrap text-muted-foreground sm:block">
                  {item.label}
                </span>
              </div>
              {index < timeline.length - 1 ? (
                <div
                  className={cn(
                    "mx-2 h-px flex-1",
                    index === 0 ? "bg-chart-4" : "bg-border",
                  )}
                />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewDashboard({
  householdName,
  userName,
}: {
  householdName: string;
  userName: string;
}) {
  const netWorthInOre = accounts.reduce(
    (total, account) => total + account.amountInOre,
    0,
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64">
      <Sidebar />
      <MobileNavigation />

      <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Min ekonomi
              </h1>
              <Badge variant="secondary" className="rounded-full">
                {householdName}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Demodata
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {overview.month} · allt viktigt på samma plats
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu name={userName} />
            <Button className="rounded-xl shadow-sm">
              <Plus className="size-4" aria-hidden="true" />
              Planera månaden
            </Button>
          </div>
        </header>

        <section
          aria-label="Månadens nyckeltal"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Kvar efter plan"
            value={formatSek(overview.availableInOre)}
            detail={`${overview.daysUntilSalary} dagar till nästa lön`}
            icon={Wallet}
          />
          <KpiCard
            label="Inkomster"
            value={formatSek(overview.incomeInOre)}
            detail="Månadens förväntade netto"
            icon={ArrowDownRight}
            tone="sage"
          />
          <KpiCard
            label="Fasta kostnader"
            value={formatSek(overview.fixedCostsInOre)}
            detail="40,5 % av inkomsten"
            icon={ArrowUpRight}
            tone="mustard"
          />
          <KpiCard
            label="Sparande"
            value={formatSek(overview.savingsInOre)}
            detail="19,9 % sparkvot"
            icon={PiggyBank}
            tone="blue"
          />
        </section>

        <section aria-label="Månadens tidslinje" className="mt-4 pb-7 sm:pb-8">
          <MonthTimeline />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Kassaflöde</CardTitle>
              <CardDescription>
                Inkomster och utgifter de senaste sex månaderna
              </CardDescription>
              <CardAction>
                <Badge variant="outline" className="gap-1 rounded-full">
                  <BarChart3 className="size-3" aria-hidden="true" />6 månader
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <CashFlowChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Närmast i kalendern</CardTitle>
              <CardDescription>
                Planerade händelser före nästa lön
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {upcoming.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-center text-xs leading-tight font-medium text-secondary-foreground">
                    {item.date.replace(" ", "\n")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">
                    −{formatSek(item.amountInOre)}
                  </span>
                </div>
              ))}
              <Button
                variant="ghost"
                className="mt-2 w-full justify-between text-primary"
              >
                Visa hela månaden
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Planens fördelning</CardTitle>
              <CardDescription>
                Utfall mot budget per huvudkategori
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {allocation.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatSek(item.amountInOre)} · {item.percent} %
                    </span>
                  </div>
                  <Progress
                    value={item.percent}
                    className={cn(
                      "h-2 [&_[data-slot=progress-indicator]]:bg-current",
                      item.color,
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Förmögenhetsbild</CardTitle>
              <CardDescription>Senaste registrerade saldon</CardDescription>
              <CardAction>
                <span className="text-sm font-semibold tabular-nums">
                  Netto {formatSek(netWorthInOre)}
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-1">
              {accounts.map((account) => (
                <div
                  key={account.label}
                  className="flex items-center justify-between border-b border-border/70 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{account.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.type}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      account.amountInOre < 0 && "text-destructive",
                    )}
                  >
                    {formatSek(account.amountInOre)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Månadsplan</CardTitle>
            <CardDescription>
              En snabb avstämning utan kalkylbladskänslan
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                Öppna planen
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Hantering</TableHead>
                  <TableHead className="text-right">Planerat</TableHead>
                  <TableHead className="text-right">Utfall</TableHead>
                  <TableHead className="text-right">Kvar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {row.destination}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSek(row.plannedInOre)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSek(row.actualInOre)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatSek(row.plannedInOre - row.actualInOre)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
