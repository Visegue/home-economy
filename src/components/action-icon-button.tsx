"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ActionIconButton({
  label,
  tone = "neutral",
  pending = false,
  children,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
  label: string;
  tone?: "neutral" | "primary" | "edit" | "positive" | "danger";
  pending?: boolean;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const expanded =
    props["aria-expanded"] === true || props["aria-expanded"] === "true";
  return (
    <Tooltip open={tooltipOpen && !expanded} onOpenChange={setTooltipOpen}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={
            tone === "danger"
              ? "destructive"
              : tone === "primary"
                ? "default"
                : tone === "edit"
                  ? "secondary"
                  : "ghost"
          }
          className={cn(
            "size-12 sm:size-10 [&_svg:not([class*='size-'])]:size-5",
            tone === "neutral" && "text-muted-foreground",
            tone === "positive" &&
              "bg-accent text-accent-foreground hover:bg-accent/80 hover:text-accent-foreground",
            className,
          )}
          aria-label={label}
          aria-busy={pending || undefined}
          disabled={disabled || pending}
          {...props}
        >
          {pending ? (
            <LoaderCircle
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            children
          )}
        </Button>
      </TooltipTrigger>
      {/* An open dialog/menu must own Escape, including during animations. */}
      {expanded ? null : <TooltipContent>{label}</TooltipContent>}
    </Tooltip>
  );
}
