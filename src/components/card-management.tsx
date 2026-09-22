"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, Pencil } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";

const ManagementContext = createContext<{
  editing: boolean;
  setEditing: (editing: boolean) => void;
} | null>(null);

function useManagement() {
  const context = useContext(ManagementContext);
  if (!context) throw new Error("Card management requires a provider.");
  return context;
}

export function CardManagement({
  children,
  hasItems,
}: {
  children: ReactNode;
  hasItems: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // Keep the add dialog mounted so it can restore focus to its trigger.
  if (!hasItems && editing) setEditing(false);
  return (
    <ManagementContext value={{ editing, setEditing }}>
      {children}
    </ManagementContext>
  );
}

export function CardManagementButton({ label }: { label: string }) {
  const { editing, setEditing } = useManagement();
  return (
    <ActionIconButton
      label={editing ? `Klar med ${label}` : `Hantera ${label}`}
      tone={editing ? "positive" : "neutral"}
      aria-pressed={editing}
      onClick={() => setEditing(!editing)}
    >
      {editing ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
    </ActionIconButton>
  );
}

export function ManagementOnly({ children }: { children: ReactNode }) {
  const { editing } = useManagement();
  return editing ? children : null;
}
