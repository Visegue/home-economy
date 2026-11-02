"use client";
import type { ReactNode } from "react";
import { useNavigation } from "@/components/navigation";
import type { HouseholdPerson } from "@/features/households/members/model";
import { CreatePost } from "./create-post";
import { MonthSelector } from "./month-selector";
export function OverviewToolbar({
  period,
  people,
  deposits,
}: {
  period: string;
  people: HouseholdPerson[];
  deposits: ReactNode;
}) {
  const { pending } = useNavigation();
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <MonthSelector period={period} />
      <fieldset
        disabled={pending}
        inert={pending || undefined}
        aria-label="Månadens åtgärder"
        className="flex min-w-0 flex-wrap items-start gap-3 pb-4 lg:justify-end lg:pb-0"
      >
        {deposits}
        <CreatePost period={period} people={people} />
      </fieldset>
    </div>
  );
}
