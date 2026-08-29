"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function UserMenu({ name }: { name: string }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline">
        {name}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" />
        {pending ? "Loggar ut…" : "Logga ut"}
      </Button>
    </div>
  );
}
