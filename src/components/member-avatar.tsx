import { cn } from "@/lib/utils";
import {
  defaultMemberColor,
  memberInitials,
  memberTextColor,
} from "@/features/households/member-appearance";

export function MemberAvatar({
  name,
  color = defaultMemberColor,
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="member-avatar"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs leading-none font-semibold ring-1 ring-black/10 ring-inset",
        className,
      )}
      style={{ backgroundColor: color, color: memberTextColor(color) }}
    >
      {memberInitials(name)}
    </span>
  );
}
