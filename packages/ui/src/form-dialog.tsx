"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { FormDialogContent } from "./form-dialog-content";

type Guard = { dirty: boolean; pending: boolean };
const FormGuardContext = createContext<((guard: Guard) => void) | null>(null);

export function FormDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const guard = useRef<Guard>({ dirty: false, pending: false });
  const updateGuard = useCallback((value: Guard) => {
    guard.current = value;
  }, []);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const discarded = useRef(false);

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && guard.current.pending) return;
    if (!nextOpen && guard.current.dirty) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      discarded.current = false;
      setConfirmDiscard(true);
    } else {
      onOpenChange(nextOpen);
    }
  }

  return (
    <FormGuardContext value={updateGuard}>
      <Dialog open={open} onOpenChange={requestOpenChange}>
        {children}
        <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
          <FormDialogContent
            title="Du har osparade ändringar"
            description="Vill du fortsätta redigera eller kasta ändringarna?"
            role="alertdialog"
            showCloseButton={false}
            onKeyDownCapture={(event) => {
              // Keep Escape in this prompt while Radix registers its new layer.
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setConfirmDiscard(false);
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              continueButton.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!discarded.current) previousFocus.current?.focus();
            }}
          >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Button
                className="h-auto min-h-11 min-w-0 flex-wrap py-2 whitespace-normal"
                ref={continueButton}
                type="button"
                onClick={() => setConfirmDiscard(false)}
              >
                <Pencil aria-hidden="true" />
                <span className="min-w-0">Fortsätt redigera</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 min-w-0 flex-wrap py-2 whitespace-normal"
                onClick={() => {
                  discarded.current = true;
                  setConfirmDiscard(false);
                  onOpenChange(false);
                }}
              >
                <Trash2 aria-hidden="true" />
                <span className="min-w-0">Kasta ändringar</span>
              </Button>
            </div>
          </FormDialogContent>
        </Dialog>
      </Dialog>
    </FormGuardContext>
  );
}

// Compare form values, not input events: restoring the original values is clean.
export function useFormGuard(values: unknown, pending: boolean) {
  const updateGuard = useContext(FormGuardContext);
  if (!updateGuard) throw new Error("Form changes require a FormDialog.");
  const snapshot = JSON.stringify(values);
  const [initial] = useState(snapshot);
  const dirty = snapshot !== initial;
  useLayoutEffect(() => {
    updateGuard({ dirty, pending });
    return () => {
      updateGuard({ dirty: false, pending: false });
    };
  }, [updateGuard, dirty, pending]);
}

export function useCloseAfterSave(
  success: boolean,
  pending: boolean,
  onSaved: () => void,
) {
  // Wait for the action and refreshed Server Component props to commit together.
  // Closing inside the async action can let a fast reopen capture stale values.
  useEffect(() => {
    if (success && !pending) onSaved();
  }, [success, pending, onSaved]);
}
