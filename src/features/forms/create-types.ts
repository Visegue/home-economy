import { CalendarClock, PiggyBank, ReceiptText, RefreshCw } from "lucide-react";
export const createTypes = [
  {
    value: "direct",
    label: "Direkt utgift",
    description: "Betalas direkt, utan månadsavsättning.",
    icon: ReceiptText,
  },
  {
    value: "allocated",
    label: "Avsatt utgift",
    description: "Lägg undan inför en kommande betalning.",
    icon: CalendarClock,
  },
  {
    value: "settlement",
    label: "Avräkning",
    description: "Planera för större utgifter på lång sikt.",
    icon: RefreshCw,
  },
  {
    value: "saving",
    label: "Sparande",
    description: "Spara till ett ändamål.",
    icon: PiggyBank,
  },
] as const;
export type CreateType = (typeof createTypes)[number]["value"];
