import type { ComponentProps, ReactNode } from "react";
import { cn } from "./utils";

export function PageHeading({
  className,
  children,
  ...props
}: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold tracking-tight sm:text-3xl",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function AuthLayout({
  children,
  header,
  compact = false,
}: {
  children: ReactNode;
  header?: ReactNode;
  compact?: boolean;
}) {
  return (
    <main
      className={cn(
        "min-h-dvh px-4 py-8 sm:px-6 sm:py-12",
        !header && "grid place-items-center",
      )}
    >
      <div className={cn("mx-auto w-full", compact ? "max-w-md" : "max-w-lg")}>
        {header ? <div className="flex justify-end pb-6">{header}</div> : null}
        {children}
      </div>
    </main>
  );
}

export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t bg-popover pt-4 pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      {...props}
    />
  );
}
