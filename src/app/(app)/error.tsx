"use client";
import { NavigationError } from "@/components/navigation";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <NavigationError retry={retry} />;
}
