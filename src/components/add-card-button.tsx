import { Plus } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";

export function AddCardButton({
  label,
  ...props
}: Omit<React.ComponentProps<typeof ActionIconButton>, "children">) {
  return (
    <ActionIconButton label={label} tone="primary" {...props}>
      <Plus aria-hidden="true" />
    </ActionIconButton>
  );
}
