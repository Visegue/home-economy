"use client";

import { useState } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HouseholdPerson } from "@/features/households/member-appearance";

export function MemberAvatarGroup({ people }: { people: HouseholdPerson[] }) {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const names = people.map((person) => person.name).join(", ");
  const remaining = people.length - 3;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={tooltipOpen && !open} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-full px-0.5"
              aria-label={`Ägare: ${names}`}
            >
              <span
                aria-hidden="true"
                className="isolate inline-flex -space-x-2"
              >
                {people.slice(0, 3).map((person) => (
                  <MemberAvatar
                    key={person.id}
                    name={person.name}
                    color={person.color}
                    className="size-7 border-2 border-card text-[10px] ring-0"
                  />
                ))}
                {remaining > 0 ? (
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                    +{remaining}
                  </span>
                ) : null}
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {tooltipOpen && !open ? <TooltipContent>{names}</TooltipContent> : null}
      </Tooltip>
      <PopoverContent aria-label="Utgiftens ägare" className="w-64">
        <p className="mb-3 text-sm font-medium">Utgiftens ägare</p>
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2 text-sm">
              <MemberAvatar
                name={person.name}
                color={person.color}
                className="size-7 text-[10px]"
              />
              <span className="min-w-0 break-words">{person.name}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
