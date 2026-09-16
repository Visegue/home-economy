import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeaturePlaceholder({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon aria-hidden="true" />
        </div>
        <CardTitle>{title} · Under uppbyggnad</CardTitle>
        <CardDescription className="max-w-2xl leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
