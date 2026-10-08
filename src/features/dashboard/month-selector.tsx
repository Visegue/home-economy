"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  currentPeriod,
  periodSchema,
  shiftPeriod,
} from "@/features/budget/model";

const disabledControl =
  "aria-disabled:pointer-events-none aria-disabled:opacity-50";

export function MonthSelector({ period }: { period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState({ period, value: period });
  // Reset native input drafts on confirmed navigation without remounting focus.
  if (input.period !== period) setInput({ period, value: period });

  function navigate(value: string) {
    if (isPending || !periodSchema.safeParse(value).success) return;
    setInput({ period, value: period });
    if (value === period) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    startTransition(() => {
      router.push(`${pathname}?${params}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="overview-month">Välj månad</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Föregående månad"
          aria-disabled={isPending || period === "1900-01"}
          className={disabledControl}
          onClick={() => navigate(shiftPeriod(period, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Input
          id="overview-month"
          name="month"
          type="month"
          min="1900-01"
          max="2199-12"
          value={input.value}
          readOnly={isPending}
          aria-disabled={isPending}
          className="w-44 max-w-full aria-disabled:opacity-50"
          onChange={(event) => {
            if (isPending) return;
            const value = event.target.value;
            setInput({ period, value });
            navigate(value);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nästa månad"
          aria-disabled={isPending || period === "2199-12"}
          className={disabledControl}
          onClick={() => navigate(shiftPeriod(period, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-disabled={isPending}
          className={disabledControl}
          onClick={() => navigate(currentPeriod())}
        >
          Denna månad
        </Button>
      </div>
      <output
        aria-live="polite"
        className="flex h-5 items-center gap-2 text-sm text-muted-foreground"
      >
        {isPending ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Laddar månad…
          </>
        ) : null}
      </output>
    </div>
  );
}
