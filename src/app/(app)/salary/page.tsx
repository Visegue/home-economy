import { WalletCards } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Lönekoll" };

export default function SalaryPage() {
  return (
    <FeaturePlaceholder
      title="Lönekoll"
      description="Saldot fram till nästa lön."
      icon={WalletCards}
    />
  );
}
