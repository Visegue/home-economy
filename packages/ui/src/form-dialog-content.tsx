"use client";

import { useCallback, useRef, type ReactNode } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export function FormDialogContent({
  title,
  description,
  children,
  onOpenAutoFocus,
  showCloseButton = true,
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
    let focusFrame = 0;

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
      if (focused === content || focused.closest('[data-slot="form-actions"]'))
        return;
      const field = focused.getBoundingClientRect();
      const dialog = content.getBoundingClientRect();
      const footer = content
        .querySelector<HTMLElement>('[data-slot="form-actions"]')
        ?.getBoundingClientRect();
      const bottom = footer
        ? Math.min(dialog.bottom - 16, footer.top - 12)
        : dialog.bottom - 16;
      const feedbackBottom = (focused.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .reduce((edge, id) => {
          const feedback = document.getElementById(id);
          return feedback instanceof HTMLElement &&
            content.contains(feedback) &&
            feedback.getAttribute("role") === "alert"
            ? Math.max(edge, feedback.getBoundingClientRect().bottom)
            : edge;
        }, field.bottom);
      if (field.top < dialog.top + 16) {
        content.scrollTop -= dialog.top + 16 - field.top;
      } else if (feedbackBottom > bottom) {
        // Keep the focused control visible even when a long message must scroll.
        content.scrollTop += Math.min(
          feedbackBottom - bottom,
          Math.max(0, field.top - dialog.top - 16),
        );
      }
    };
    // Native focus scrolling does not account for a sticky form footer.
    const updateAfterFocus = () => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(updateViewport);
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    content.addEventListener("focusin", updateAfterFocus);
    return () => {
      contentRef.current = null;
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
      content.removeEventListener("focusin", updateAfterFocus);
      cancelAnimationFrame(focusFrame);
    };
  }, []);

  return (
    <DialogContent
      {...props}
      ref={attachContent}
      showCloseButton={showCloseButton}
      className="max-h-[90dvh] scroll-py-4 overflow-y-auto overscroll-contain transition-none sm:max-w-lg"
      onOpenAutoFocus={(event) => {
        onOpenAutoFocus?.(event);
        if (event.defaultPrevented) return;
        if (window.matchMedia("(pointer: coarse)").matches) {
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <DialogHeader className={showCloseButton ? "pr-8" : undefined}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className={description ? undefined : "sr-only"}>
          {description ?? title}
        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
