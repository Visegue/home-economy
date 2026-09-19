"use client";

import { LogOut } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

type SignOutButtonProps = Pick<
  ComponentProps<typeof Button>,
  "size" | "variant"
>;

export function SignOutButton({
  size = "default",
  variant = "outline",
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/login");
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={signOut}
    >
      <LogOut aria-hidden="true" />
      {pending ? "Loggar ut…" : "Logga ut"}
    </Button>
  );
}

export function UserMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline">
        {name}
      </span>
      <SignOutButton variant="ghost" size="sm" />
    </div>
  );
}
