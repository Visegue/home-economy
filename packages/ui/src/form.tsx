"use client";

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Input as BaseInput } from "./input";
import { SelectTrigger as BaseSelectTrigger } from "./select";
import { ChoiceInput as BaseChoiceInput } from "./choice";
import { cn } from "./utils";

export type FieldErrors = Record<string, string | undefined>;
const Feedback = createContext<FieldErrors>({});

function nativeErrors(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of Array.from(form.elements)) {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) ||
      !field.willValidate ||
      !field.name
    )
      continue;
    const value = field.value;
    const missing =
      field instanceof HTMLInputElement &&
      ["checkbox", "radio"].includes(field.type)
        ? field.validity.valueMissing
        : field.required && value === "";
    if (missing) errors[field.name] = "Fyll i fältet.";
    else if (field.validity.typeMismatch)
      errors[field.name] = "Ange en giltig e-postadress.";
    else if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      value &&
      field.minLength > 0 &&
      value.length < field.minLength
    )
      errors[field.name] = `Ange minst ${field.minLength} tecken.`;
    else if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      field.maxLength > 0 &&
      value.length > field.maxLength
    )
      errors[field.name] = `Ange högst ${field.maxLength} tecken.`;
    else if (field.validity.rangeUnderflow || field.validity.rangeOverflow)
      errors[field.name] = "Välj ett värde inom det tillåtna intervallet.";
    else if (!field.validity.valid)
      errors[field.name] = "Kontrollera värdet i fältet.";
  }
  return errors;
}

/** Local feedback only. Callers retain authoritative domain/server validation. */
export function Form({
  children,
  validate,
  error,
  fieldErrors = {},
  pending = false,
  onSubmit,
  onBlurCapture,
  className,
  ...props
}: ComponentProps<"form"> & {
  validate?: (data: FormData) => FieldErrors;
  error?: string;
  fieldErrors?: FieldErrors;
  pending?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const attempted = useRef(false);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const [focusAttempt, setFocusAttempt] = useState(0);
  const serverKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(fieldErrors).filter(([, message]) => message),
    ),
  );
  const errors = {
    ...localErrors,
    ...(!pending
      ? Object.fromEntries(
          Object.entries(fieldErrors).filter(([, message]) => message),
        )
      : {}),
  };

  useLayoutEffect(() => {
    if (focusAttempt)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [focusAttempt]);
  useLayoutEffect(() => {
    if (pending) return;
    const first = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (serverKey !== "{}") first?.focus();
    else if (error) errorRef.current?.focus();
  }, [error, serverKey, pending]);

  function validateLocal(form: HTMLFormElement) {
    return { ...nativeErrors(form), ...validate?.(new FormData(form)) };
  }
  return (
    <Feedback value={errors}>
      <form
        {...props}
        ref={formRef}
        noValidate
        className={className}
        onSubmit={(event) => {
          attempted.current = true;
          const next = validateLocal(event.currentTarget);
          setLocalErrors(next);
          if (Object.values(next).some(Boolean)) {
            event.preventDefault();
            setFocusAttempt((count) => count + 1);
            return;
          }
          onSubmit?.(event);
        }}
        onBlurCapture={(event) => {
          onBlurCapture?.(event);
          const target = event.target;
          const name =
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
              ? target.name
              : target instanceof HTMLElement
                ? target.closest<HTMLElement>("[data-field-name]")?.dataset
                    .fieldName
                : undefined;
          if (pending || !attempted.current || !name) return;
          const next = validateLocal(event.currentTarget);
          setLocalErrors((previous) => ({
            ...previous,
            [name]: next[name],
          }));
        }}
      >
        {error && !pending ? (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="ui-error rounded-lg border border-destructive/30 p-3 outline-offset-4"
          >
            {error}
          </p>
        ) : null}
        {children}
      </form>
    </Feedback>
  );
}

function useFeedback(name?: string, id?: string, describedBy?: string) {
  const errors = useContext(Feedback);
  const generated = useId();
  const message = name ? errors[name] : undefined;
  const errorId = `${id ?? generated}-feedback`;
  return {
    attributes: message
      ? {
          "aria-invalid": true as const,
          "aria-describedby": [describedBy, errorId].filter(Boolean).join(" "),
        }
      : {},
    feedback: message ? (
      <span id={errorId} role="alert" className="ui-error block">
        {message}
      </span>
    ) : null,
  };
}

export function Input(props: ComponentProps<typeof BaseInput>) {
  const field = useFeedback(props.name, props.id, props["aria-describedby"]);
  return (
    <>
      <BaseInput {...props} {...field.attributes} />
      {field.feedback}
    </>
  );
}
export function SelectTrigger({
  name,
  ...props
}: ComponentProps<typeof BaseSelectTrigger> & { name?: string }) {
  const field = useFeedback(name, props.id, props["aria-describedby"]);
  return (
    <>
      <BaseSelectTrigger
        {...props}
        {...field.attributes}
        data-field-name={name}
      />
      {field.feedback}
    </>
  );
}
export function ChoiceInput(props: ComponentProps<typeof BaseChoiceInput>) {
  const field = useFeedback(props.name, props.id, props["aria-describedby"]);
  return (
    <>
      <BaseChoiceInput {...props} {...field.attributes} />
      {field.feedback}
    </>
  );
}

export function FormSection({
  title,
  className,
  ...props
}: ComponentProps<"fieldset"> & { title: string }) {
  return (
    <fieldset
      className={cn("min-w-0 space-y-4 rounded-lg border p-4", className)}
      {...props}
    >
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {props.children}
    </fieldset>
  );
}

export function FormMessage({
  message,
  success = false,
  pending = false,
  children,
  ...props
}: ComponentProps<"output"> & {
  message: string;
  success?: boolean;
  pending?: boolean;
}) {
  const ref = useRef<HTMLOutputElement>(null);
  useLayoutEffect(() => {
    if (message && !success && !pending) ref.current?.focus();
  }, [message, success, pending]);
  return (
    <output
      {...props}
      ref={ref}
      role={success ? "status" : "alert"}
      tabIndex={success ? undefined : -1}
    >
      {children ?? message}
    </output>
  );
}
