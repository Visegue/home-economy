"use client";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NavigationStatus, useNavigation } from "@/components/navigation";
import {
  currentPeriod,
  monthLabel,
  periodSchema,
  shiftPeriod,
} from "@/features/budget/model";

export function MonthSelector({ period }: { period: string }) {
  const { confirmed, intent, failure, navigate } = useNavigation();
  const target = intent?.month ?? period;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ target, value: target });
  if (draft.target !== target) setDraft({ target, value: target });
  function select(value: string) {
    setDraft({ target, value });
    if (
      !periodSchema.safeParse(value).success ||
      (value === target && !failure)
    )
      return;
    const params = new URLSearchParams(window.location.search);
    params.set("month", value);
    navigate(`${confirmed.pathname}?${params}`);
  }
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Föregående månad"
          disabled={target === "1900-01"}
          onClick={() => select(shiftPeriod(target, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Öppna månadsväljaren"
              className="group h-auto min-h-11 min-w-0 flex-1 gap-3 py-2 whitespace-normal sm:w-52 sm:flex-none"
            >
              <span>{monthLabel(target)}</span>
              <ChevronDown
                className="size-4 shrink-0 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 max-w-[calc(100vw-2rem)] space-y-3"
          >
            <Label htmlFor="overview-month">Månad</Label>
            <Input
              id="overview-month"
              name="month"
              aria-label="Välj månad"
              type="month"
              min="1900-01"
              max="2199-12"
              value={draft.value}
              onChange={(event) => select(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => select(currentPeriod())}
            >
              <CalendarDays aria-hidden="true" />
              <span>Denna månad</span>
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nästa månad"
          disabled={target === "2199-12"}
          onClick={() => select(shiftPeriod(target, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <NavigationStatus month />
    </div>
  );
}
