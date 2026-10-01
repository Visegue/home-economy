"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { AddCardButton } from "@/components/add-card-button";
import { ActionIconButton } from "@/components/action-icon-button";
import {
  FormDialog,
  useFormGuard,
  useCloseAfterSave,
} from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { useSaveNotice } from "@/components/save-notice";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultMemberColor, memberColors } from "./appearance";
import type { HouseholdPerson } from "./model";
import {
  saveMemberAction,
  removeMemberAction,
  type MemberFormState,
} from "./actions";

function Feedback({ state }: { state: MemberFormState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  ) : state.success ? (
    <output className="block text-sm text-accent-foreground">
      {state.success}
    </output>
  ) : null;
}

type Person = HouseholdPerson;

export function MemberDialog({
  person,
  defaultColor = defaultMemberColor,
}: {
  person?: Person;
  defaultColor?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {person ? (
          <ActionIconButton label={`Ändra ${person.name}`} tone="edit">
            <Pencil aria-hidden="true" />
          </ActionIconButton>
        ) : (
          <AddCardButton label="Lägg till familjemedlem" />
        )}
      </DialogTrigger>
      <FormDialogContent
        title={person ? "Ändra familjemedlem" : "Lägg till familjemedlem"}
      >
        {open ? (
          <PersonForm
            person={person}
            defaultColor={defaultColor}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </FormDialog>
  );
}

function PersonForm({
  person,
  defaultColor,
  onSaved,
}: {
  person?: Person;
  defaultColor: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [color, setColor] = useState<string>(person?.color ?? defaultColor);
  const notify = useSaveNotice();
  const [state, action, pending] = useActionState(
    async (previous: MemberFormState, data: FormData) => {
      const result = await saveMemberAction(previous, data);
      if (result.success) {
        notify(
          person ? "Familjemedlemmen uppdaterad" : "Familjemedlemmen tillagd",
        );
      }
      return result;
    },
    {},
  );

  useCloseAfterSave(Boolean(state.success), pending, onSaved);
  useFormGuard({ name, color }, pending);
  return (
    <form action={action} className="space-y-5">
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      <div className="flex items-center gap-1">
        <Label htmlFor="person-name">Medlemmens namn</Label>
        <InfoButton title="Hushållets medlemmar">
          <p>
            Medlemmar kan anges som ägare på utgifter. Ett namn skapar inget
            konto och ger ingen åtkomst till hushållet.
          </p>
        </InfoButton>
      </div>
      <Input
        id="person-name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={120}
        required
        disabled={pending}
        placeholder="Till exempel Kim"
      />
      <fieldset disabled={pending} className="space-y-3">
        <legend className="mb-3 text-sm font-medium">Ikonfärg</legend>
        <div className="flex items-center gap-3">
          <MemberAvatar name={name} color={color} className="size-14 text-lg" />
          <p className="text-sm text-muted-foreground">
            Initialerna följer medlemmens namn.
          </p>
        </div>
        <div className="grid w-fit grid-cols-4 gap-2 sm:grid-cols-6">
          {memberColors.map((preset) => (
            <label key={preset.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="colorPreset"
                value={preset.value}
                aria-label={preset.name}
                checked={color === preset.value}
                onChange={() => setColor(preset.value)}
                className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span
                className="flex size-11 items-center justify-center rounded-full border-2 border-transparent peer-checked:border-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                title={preset.name}
              >
                <span
                  className="size-8 rounded-full ring-1 ring-black/10 ring-inset"
                  style={{ backgroundColor: preset.value }}
                />
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Input
            id="person-color"
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-11 w-14 cursor-pointer p-1"
          />
          <Label htmlFor="person-color">Egen färg</Label>
        </div>
      </fieldset>
      <Feedback state={state} />
      <div className="flex justify-end">
        <ActionIconButton
          type="submit"
          label="Spara familjemedlem"
          tone="positive"
          pending={pending}
        >
          <Save aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}

export function RemoveMemberDialog({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton label={`Ta bort ${person.name}`} tone="danger">
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </DialogTrigger>
      <FormDialogContent title="Ta bort familjemedlem">
        {open ? (
          <RemovePersonForm person={person} onClose={() => setOpen(false)} />
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}

function RemovePersonForm({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  const notify = useSaveNotice();
  const [state, action, pending] = useActionState(
    async (previous: MemberFormState, data: FormData) => {
      const result = await removeMemberAction(previous, data);
      if (result.success) notify("Familjemedlemmen borttagen");
      return result;
    },
    {},
  );
  useCloseAfterSave(Boolean(state.success), pending, onClose);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={person.id} />
      <p>Vill du ta bort {person.name} från hushållet?</p>
      <p className="text-sm text-muted-foreground">
        Utgifterna finns kvar, men {person.name} tas bort som ägare även för
        tidigare månader.
      </p>
      <Feedback state={state} />
      <div className="flex justify-end gap-2">
        <ActionIconButton
          ref={cancelRef}
          label="Avbryt"
          disabled={pending}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </ActionIconButton>
        <ActionIconButton
          type="submit"
          label={`Bekräfta borttagning av ${person.name}`}
          tone="danger"
          pending={pending}
        >
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}
