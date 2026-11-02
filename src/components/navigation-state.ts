import { currentPeriod, periodSchema } from "@/features/budget/model";

export const pageTitles: Record<string, string> = {
  "/": "Månadsöversikt",
  "/transfers": "Överföringar och värden",
  "/history": "Historik och kommande ändringar",
  "/salary": "Lönekoll",
  "/investments": "Investeringar",
  "/balance": "Balans",
  "/settings": "Inställningar",
};
export const monthlyPaths = ["/", "/transfers", "/history"];

export type Destination = { href: string; pathname: string; month: string };
export function destination(
  href: string,
  fallbackMonth = currentPeriod(),
): Destination {
  const url = new URL(href, "https://navigation.invalid");
  const value = url.searchParams.get("month");
  const month = periodSchema.safeParse(value).success ? value! : fallbackMonth;
  return {
    href: `${url.pathname}${url.search}`,
    pathname: url.pathname,
    month,
  };
}
export function sameDestination(a: Destination, b: Destination) {
  return (
    a.pathname === b.pathname &&
    (a.pathname === "/" || a.pathname === "/transfers"
      ? a.month === b.month
      : true)
  );
}
