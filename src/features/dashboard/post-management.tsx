"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { useSaveNotice } from "@/components/save-notice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ExpenseForm, RemoveExpenseForm } from "@/features/budget/forms";
import { SavingForm, RemoveSavingForm } from "@/features/savings/saving-form";
import { monthLabel, type BudgetExpense } from "@/features/budget/model";
import type { Saving } from "@/features/savings/validation";
import type { HouseholdPerson } from "@/features/households/members/model";

export type ManagedPost = {
  key: string;
  card: "Utgifter" | "Avräkningar" | "Spara";
  details: ReactNode;
} & (
  | { source: "expense"; item: BudgetExpense }
  | { source: "saving"; item: Saving }
);
const PostContext = createContext<{
  openPost: (key: string, trigger: HTMLButtonElement) => void;
  selectedKey?: string;
  panelId: string;
} | null>(null);

export function usePostManagement() {
  const context = useContext(PostContext);
  if (!context) throw new Error("Post rows require monthly management.");
  return context;
}

/** Owns modals above versioned rows, including when the last row disappears. */
export function PostManagement({
  posts,
  people,
  period,
  children,
}: {
  posts: ManagedPost[];
  people: HouseholdPerson[];
  period: string;
  children: ReactNode;
}) {
  const [confirmedPeriod, setConfirmedPeriod] = useState(period);
  const [selection, setSelection] = useState<ManagedPost | null>(null);
  const [phase, setPhase] = useState<"details" | "edit" | "end" | null>(null);
  // Reset only modal state: remounting the page would lose selector focus and scroll.
  if (confirmedPeriod !== period) {
    setConfirmedPeriod(period);
    setSelection(null);
    setPhase(null);
  }
  const body = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const edit = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLButtonElement>(null);
  const returnToAction = useRef<"edit" | "end" | null>(null);
  const returnToName = useRef(false);
  const cardFocus = useRef<string | null>(null);
  const panelId = useId();
  const notify = useSaveNotice();
  const selected =
    selection && posts.find((post) => post.key === selection.key);

  function focusCard() {
    if (!cardFocus.current) return;
    body.current
      ?.querySelector<HTMLElement>(`[data-post-card="${cardFocus.current}"]`)
      ?.focus({ preventScroll: true });
    cardFocus.current = null;
  }
  function saved(savedId?: number) {
    if (!selection) return;
    // A legacy version gains an identity on first write. Follow the returned
    // version or the refreshed original, never a name or a guessed relationship.
    const written = posts.find(
      (post) => post.source === selection.source && post.item.id === savedId,
    );
    const original = posts.find(
      (post) =>
        post.source === selection.source && post.item.id === selection.item.id,
    );
    const itemId =
      written?.item.itemId ?? original?.item.itemId ?? selection.item.itemId;
    const updated =
      written ??
      (itemId
        ? posts.find(
            (post) =>
              post.source === selection.source && post.item.itemId === itemId,
          )
        : original);
    if (updated) {
      setSelection(updated);
      returnToAction.current = "edit";
      setPhase("details");
    } else {
      cardFocus.current = selection.card;
      setPhase(null);
      setSelection(null);
      notify("Posten uppdaterad. Den visas inte längre i den valda månaden.");
    }
  }

  function cancelEnd() {
    returnToAction.current = "end";
    setPhase("details");
  }
  function removed() {
    if (!selection) return;
    cardFocus.current = selection.card;
    notify(
      selection.source === "saving"
        ? "Sparandet avslutat"
        : selection.item.destination === "settlement"
          ? "Avräkningen avslutad"
          : "Utgiften avslutad",
    );
    setPhase(null);
    setSelection(null);
  }

  return (
    <PostContext
      value={{
        panelId,
        selectedKey: phase === "details" ? selected?.key : undefined,
        openPost: (key, element) => {
          const post = posts.find((post) => post.key === key);
          if (!post) return;
          trigger.current = element;
          returnToAction.current = null;
          setSelection(post);
          setPhase("details");
        },
      }}
    >
      <div ref={body}>{children}</div>
      {phase === "details" && selected ? (
        <Sheet
          open={phase === "details" && !!selected}
          onOpenChange={(open) => {
            if (!open) {
              returnToName.current = true;
              setPhase(null);
            }
          }}
        >
          <SheetContent
            id={panelId}
            showCloseButton={false}
            className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
            onOpenAutoFocus={(event) => {
              if (returnToAction.current) {
                event.preventDefault();
                (returnToAction.current === "edit" ? edit : end).current?.focus(
                  { preventScroll: true },
                );
                returnToAction.current = null;
              }
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (returnToName.current) {
                returnToName.current = false;
                const name =
                  selected &&
                  body.current?.querySelector<HTMLButtonElement>(
                    `[data-post-key="${selected.key}"]`,
                  );
                (name ?? trigger.current)?.focus({ preventScroll: true });
              }
            }}
          >
            <SheetHeader className="shrink-0 border-b pr-24">
              <SheetTitle className="break-words">
                {selected?.item.name}
              </SheetTitle>
              <SheetDescription>
                Postens detaljer och registrerade överföringar.
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <Button variant="outline" className="absolute top-3 right-3">
                Stäng
              </Button>
            </SheetClose>
            <div className="min-h-0 overflow-y-auto p-4 [overflow-wrap:anywhere]">
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  ref={edit}
                  onClick={() => {
                    if (selected) setSelection(selected);
                    setPhase("edit");
                  }}
                >
                  Ändra
                </Button>
                <Button
                  ref={end}
                  variant="outline"
                  onClick={() => {
                    setSelection(selected);
                    setPhase("end");
                  }}
                >
                  Avsluta
                </Button>
              </div>
              {selected?.details}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
      {(phase === "edit" || phase === "end") && selection ? (
        <FormDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              returnToAction.current = phase;
              setPhase("details");
            }
          }}
        >
          <FormDialogContent
            title={
              phase === "end"
                ? selection.source === "saving"
                  ? "Avsluta sparande"
                  : "Avsluta utgift"
                : selection.source === "saving"
                  ? "Ändra sparande"
                  : selection.item.destination === "settlement"
                    ? "Ändra avräkning"
                    : "Ändra utgift"
            }
            description={
              phase === "edit" && selection.source === "expense"
                ? "Välj datum för ändringen. Tidigare värden och framtida ändringar behålls." +
                  (selection.item.endsOn
                    ? ` Perioden slutar ${monthLabel(selection.item.endsOn.slice(0, 7))}.`
                    : "")
                : undefined
            }
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              focusCard();
            }}
          >
            {phase === "end" ? (
              selection.source === "saving" ? (
                <RemoveSavingForm
                  saving={selection.item}
                  period={period}
                  onCancel={cancelEnd}
                  onRemoved={removed}
                />
              ) : (
                <RemoveExpenseForm
                  expense={selection.item}
                  period={period}
                  onCancel={cancelEnd}
                  onRemoved={removed}
                />
              )
            ) : selection.source === "saving" ? (
              <SavingForm
                saving={selection.item}
                period={period}
                onSaved={saved}
              />
            ) : (
              <ExpenseForm
                expense={selection.item}
                people={people}
                period={period}
                defaultType={selection.item.destination}
                onSaved={saved}
              />
            )}
          </FormDialogContent>
        </FormDialog>
      ) : null}
    </PostContext>
  );
}
