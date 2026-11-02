"use client";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuardedAction } from "@/components/form-dialog";
import { createTypes, type CreateType } from "./create-types";
export function CreateTypeSummary({
  type,
  pending,
  onChangeType,
}: {
  type: CreateType;
  pending: boolean;
  onChangeType: () => void;
}) {
  const request = useGuardedAction();
  const selected = createTypes.find((option) => option.value === type)!;
  const Icon = selected.icon;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <Icon
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
        {selected.label}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => request(onChangeType, "Kasta ändringar och byt typ")}
      >
        <ArrowLeftRight aria-hidden="true" />
        <span>Byt typ</span>
      </Button>
    </div>
  );
}
