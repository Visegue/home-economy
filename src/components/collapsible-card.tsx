"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();

  return (
    <Card className={cn("w-full self-start", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        <CardAction className="flex shrink-0 items-center gap-1 self-center sm:gap-2">
          {actions ? (
            <div hidden={!expanded}>
              <div className="flex items-center gap-1 sm:gap-2">{actions}</div>
            </div>
          ) : null}
          <ActionIconButton
            label={`${expanded ? "Minimera" : "Expandera"} ${title}`}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </ActionIconButton>
        </CardAction>
      </CardHeader>
      <CardContent id={contentId} hidden={!expanded}>
        {children}
      </CardContent>
    </Card>
  );
}
