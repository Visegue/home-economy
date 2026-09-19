import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddCardButton({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children"> & {
  label: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      className={cn("size-11 sm:size-8", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Plus aria-hidden="true" />
    </Button>
  );
}
