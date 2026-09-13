import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";

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

export function OverviewDashboard() {
  const netWorthInOre = accounts.reduce(
    (total, account) => total + account.amountInOre,
    0,
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge variant="outline" className="rounded-full">
          {overview.month} · Demodata
        </Badge>
        <Button className="rounded-xl shadow-sm">
          <Plus className="size-4" aria-hidden="true" />
          Planera månaden
        </Button>
      </div>
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
    </>
  );
}
