"use client";

import { useCallback, useRef, type ReactNode } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FormDialogContent({
  title,
  description,
  children,
  onOpenAutoFocus,
  ...props
}: {
  title: string;
  description?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof DialogContent>, "title" | "children">) {
  const contentRef = useRef<HTMLDivElement>(null);
  const attachContent = useCallback((content: HTMLDivElement | null) => {
    contentRef.current = content;
    const viewport = window.visualViewport;
    if (!content || !viewport) return;

    const updateViewport = () => {
      // The keyboard can shrink the visual viewport without changing dvh.
      // Leave pinch zoom to the browser so users can pan over the dialog.
      if (viewport.scale !== 1) {
        content.style.removeProperty("top");
        content.style.removeProperty("max-height");
        return;
      }
      content.style.top = `${viewport.offsetTop + viewport.height / 2}px`;
      content.style.maxHeight = `min(90dvh, ${Math.max(0, viewport.height - 32)}px)`;

      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !content.contains(focused)) {
        return;
      }
      if (focused === content) return;
      const field = focused.getBoundingClientRect();
      const dialog = content.getBoundingClientRect();
      if (field.bottom > dialog.bottom - 16) {
        content.scrollTop += field.bottom - dialog.bottom + 16;
      } else if (field.top < dialog.top + 16) {
        content.scrollTop -= dialog.top + 16 - field.top;
      }
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    return () => {
      contentRef.current = null;
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
    };
  }, []);

  return (
    <DialogContent
      {...props}
      ref={attachContent}
      className="max-h-[90dvh] scroll-py-4 overflow-y-auto overscroll-contain sm:max-w-lg"
      onOpenAutoFocus={(event) => {
        onOpenAutoFocus?.(event);
        if (event.defaultPrevented) return;
        if (window.matchMedia("(pointer: coarse)").matches) {
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <DialogHeader className="pr-8">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className={description ? undefined : "sr-only"}>
          {description ?? title}
        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
