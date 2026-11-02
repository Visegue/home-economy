"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { useNavigation } from "@/components/navigation";
import { ExpenseForm } from "@/features/budget/forms";
import { SavingForm } from "@/features/savings/saving-form";
import type { HouseholdPerson } from "@/features/households/members/model";
import { createTypes, type CreateType } from "@/features/forms/create-types";
function TypeChoices({
  previous,
  onChoose,
}: {
  previous: CreateType;
  onChoose: (type: CreateType) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    body.current
      ?.querySelector<HTMLButtonElement>(`[data-type="${previous}"]`)
      ?.focus({ preventScroll: true });
  }, [previous]);
  return (
    <div ref={body} className="space-y-2">
      {createTypes.map(({ value, label, description, icon: Icon }) => (
        <Button
          type="button"
          key={value}
          data-type={value}
          variant="outline"
          className="h-auto min-h-14 w-full justify-start gap-3 py-3 text-left whitespace-normal"
          onClick={() => onChoose(value)}
        >
          <Icon
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
          <span>
            <span className="block font-medium">{label}</span>
            <span className="block text-sm font-normal text-muted-foreground">
              {description}
            </span>
          </span>
        </Button>
      ))}
    </div>
  );
}
export function CreatePost({
  period,
  people,
}: {
  period: string;
  people: HouseholdPerson[];
}) {
  const { pending } = useNavigation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreateType>("direct");
  const [choosing, setChoosing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const opening = useRef(false);
  const selected = createTypes.find((option) => option.value === type)!;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            ref={trigger}
            disabled={pending}
            className="min-h-11 gap-2"
          >
            <Plus aria-hidden="true" />
            <span>Lägg till</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)]"
          onCloseAutoFocus={(event) => {
            if (opening.current) {
              event.preventDefault();
              opening.current = false;
            }
          }}
        >
          {createTypes.map(({ value, label, description, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              className="min-h-14 gap-3 py-3"
              onSelect={() => {
                opening.current = true;
                setType(value);
                setChoosing(false);
                setOpen(true);
              }}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-muted-foreground">
                  {description}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <FormDialog open={open} onOpenChange={setOpen}>
        <FormDialogContent
          title={
            choosing
              ? "Byt typ"
              : `Lägg till ${selected.label.toLocaleLowerCase("sv-SE")}`
          }
          description={
            choosing
              ? "Välj vilken post du vill skapa."
              : "Skapa en definition. Pengar registreras separat när insättningen har utförts."
          }
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
          }}
        >
          {open ? (
            choosing ? (
              <TypeChoices
                previous={type}
                onChoose={(value) => {
                  setType(value);
                  setChoosing(false);
                }}
              />
            ) : type === "saving" ? (
              <SavingForm
                key={type}
                period={period}
                onChangeType={() => setChoosing(true)}
                onSaved={() => setOpen(false)}
              />
            ) : (
              <ExpenseForm
                key={type}
                period={period}
                people={people}
                defaultType={type}
                onChangeType={() => setChoosing(true)}
                onSaved={() => setOpen(false)}
              />
            )
          ) : null}
        </FormDialogContent>
      </FormDialog>
    </>
  );
}
