"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

/** Details are rendered on the server; only the panel interaction is client-side. */
export function ItemDetails({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger className="min-h-10 cursor-pointer text-left font-medium [overflow-wrap:anywhere] text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2">
        {name}
      </SheetTrigger>
      <SheetContent
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b pr-24">
          <SheetTitle className="break-words">{name}</SheetTitle>
          <SheetDescription>
            Postens detaljer och registrerade överföringar.
          </SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="outline" className="absolute top-3 right-3">
            Stäng
          </Button>
        </SheetClose>
        <div className="min-h-0 overflow-y-auto p-4 [overflow-wrap:anywhere]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
