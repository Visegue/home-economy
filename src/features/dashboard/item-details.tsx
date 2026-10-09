"use client";

import { useRef, type ReactNode } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { usePostManagement } from "./post-management";

/** Details are rendered on the server; only the panel interaction is client-side. */
export function ItemDetails({
  name,
  postKey,
  cells,
  changed,
}: {
  name: string;
  postKey: string;
  cells: ReactNode;
  changed: boolean;
}) {
  const management = usePostManagement();
  const trigger = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    scrollX: number;
    scrollY: number;
    dragged: boolean;
  } | null>(null);
  return (
    <TableRow
      className="cursor-pointer focus-within:bg-muted/50 active:bg-muted"
      onPointerDown={(event) => {
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          dragged: !event.isPrimary || event.button !== 0,
        };
      }}
      onPointerMove={(event) => {
        const start = gesture.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        )
          start.dragged = true;
      }}
      onPointerCancel={() => {
        if (gesture.current) gesture.current.dragged = true;
      }}
      onClick={(event) => {
        const target = event.target;
        const start = gesture.current;
        if (
          (start &&
            (start.dragged ||
              start.scrollX !== window.scrollX ||
              start.scrollY !== window.scrollY)) ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          !(target instanceof Element) ||
          !event.currentTarget.contains(target) ||
          target.closest(
            "button, a, input, select, textarea, [role=button], [role=checkbox], [contenteditable]:not([contenteditable=false])",
          ) ||
          !window.getSelection()?.isCollapsed
        )
          return;
        trigger.current?.click();
      }}
    >
      <TableCell>
        <button
          type="button"
          data-post-key={postKey}
          aria-haspopup="dialog"
          aria-controls={management.panelId}
          aria-expanded={management.selectedKey === postKey}
          onClick={() => {
            if (trigger.current) management.openPost(postKey, trigger.current);
          }}
          ref={trigger}
          className="min-h-10 cursor-pointer text-left font-medium [overflow-wrap:anywhere] text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {name}
        </button>
        {changed ? (
          <p className="text-xs text-muted-foreground">Ändrad under månaden</p>
        ) : null}
      </TableCell>
      {cells}
    </TableRow>
  );
}
