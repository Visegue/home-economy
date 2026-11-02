import { NavigationPage } from "@/components/navigation";
import { WalletCards } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Lönekoll" };

export default function SalaryPage() {
  return (
    <NavigationPage pathname="/salary">
      <FeaturePlaceholder
        title="Lönekoll"
        description="Saldot fram till nästa lön."
        icon={WalletCards}
      />
    </NavigationPage>
  );
}
