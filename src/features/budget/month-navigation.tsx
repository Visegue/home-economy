import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthLabel, periodSchema, shiftPeriod } from "./model";

export function MonthNavigation({
  period,
  path = "/",
}: {
  period: string;
  path?: string;
}) {
  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          asChild={periodSchema.safeParse(previous).success}
          disabled={!periodSchema.safeParse(previous).success}
        >
          {periodSchema.safeParse(previous).success ? (
            <Link
              href={`${path}?month=${previous}`}
              aria-label="Föregående månad"
            >
              <ChevronLeft aria-hidden="true" />
            </Link>
          ) : (
            <ChevronLeft aria-label="Föregående månad" />
          )}
        </Button>
        <h2 className="min-w-40 text-center text-lg font-semibold capitalize">
          {monthLabel(period)}
        </h2>
        <Button
          variant="outline"
          size="icon"
          asChild={periodSchema.safeParse(next).success}
          disabled={!periodSchema.safeParse(next).success}
        >
          {periodSchema.safeParse(next).success ? (
            <Link href={`${path}?month=${next}`} aria-label="Nästa månad">
              <ChevronRight aria-hidden="true" />
            </Link>
          ) : (
            <ChevronRight aria-label="Nästa månad" />
          )}
        </Button>
      </div>
      <form action={path} className="flex items-center gap-2">
        <Label htmlFor="month" className="sr-only">
          Välj månad
        </Label>
        <Input
          id="month"
          name="month"
          type="month"
          min="1900-01"
          max="2199-12"
          defaultValue={period}
          key={period}
          required
          className="w-48"
        />
        <Button variant="ghost" size="sm">
          Visa
        </Button>
      </form>
    </div>
  );
}
