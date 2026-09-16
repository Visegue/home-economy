import { CircleDashed, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeaturePlaceholder({
  description,
  icon: Icon,
  sections,
  title,
}: {
  description: string;
  icon: LucideIcon;
  sections: readonly string[];
  title: string;
}) {
  return (
    <Card className="min-h-80 border-dashed">
      <CardHeader className="border-b">
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="max-w-2xl leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            <CircleDashed aria-hidden="true" />
            Under uppbyggnad
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section}
              className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm font-medium"
            >
              {section}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
