"use client";

import { Info, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function InfoButton({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          aria-label={`Information om ${title.toLocaleLowerCase("sv")}`}
        >
          <Info className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby={titleId}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p id={titleId} className="text-sm font-medium">
            {title}
          </p>
          <PopoverClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Stäng information"
            >
              <X aria-hidden="true" />
            </Button>
          </PopoverClose>
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
