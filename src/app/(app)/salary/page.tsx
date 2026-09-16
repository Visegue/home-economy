import { WalletCards } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Lönekoll" };

export default function SalaryPage() {
  return (
    <FeaturePlaceholder
      title="Håll koll fram till nästa lön"
      description="Här kommer du att kunna följa hur mycket som finns kvar på kontot dag för dag och jämföra månadens faktiska utgifter med tidigare löneperioder."
      icon={WalletCards}
      sections={[
        "Saldo före nästa lön",
        "Daglig förbrukning",
        "Jämförelse mellan löneperioder",
      ]}
    />
  );
}
