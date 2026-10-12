import type { ComponentProps } from "react";
import { cn } from "./utils";

export function ChoiceInput({
  className,
  type,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { type: "radio" | "checkbox" }) {
  return (
    <input
      type={type}
      className={cn(
        "size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
