"use client";

import { Check, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { currentPeriod, monthLabel } from "@/features/budget/model";

const SaveNoticeContext = createContext<((message: string) => void) | null>(
  null,
);

export function SaveNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string } | null>(null);
  const notify = useCallback((message: string) => setNotice({ message }), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <SaveNoticeContext value={notify}>
      {children}
      <output
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex justify-center lg:bottom-6"
      >
        {notice ? (
          <span className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm text-card-foreground shadow-lg">
            <Check
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{notice.message}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Stäng bekräftelsen"
              onClick={() => setNotice(null)}
            >
              <X aria-hidden="true" />
            </Button>
          </span>
        ) : null}
      </output>
    </SaveNoticeContext>
  );
}

export function useSaveNotice() {
  const notify = useContext(SaveNoticeContext);
  if (!notify) throw new Error("Save notices require a provider.");
  return notify;
}

export function savedMessage(message: string, period?: string) {
  return period && period > currentPeriod()
    ? `${message} från ${monthLabel(period)}`
    : message;
}
