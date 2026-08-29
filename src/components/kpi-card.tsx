import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "aubergine" | "blue" | "mustard" | "sage";
}

const tones = {
  aubergine: "bg-primary/10 text-primary",
  blue: "bg-chart-2/15 text-chart-2",
  mustard: "bg-chart-3/20 text-foreground",
  sage: "bg-chart-4/20 text-chart-4",
};

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "aubergine",
}: KpiCardProps) {
  return (
    <Card className="shadow-sm shadow-primary/5">
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", tones[tone])}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
