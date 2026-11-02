import { NavigationPage } from "@/components/navigation";
import { Landmark } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Balans" };

export default function BalancePage() {
  return (
    <NavigationPage pathname="/balance">
      <FeaturePlaceholder
        title="Balans"
        description="Tillgångar, lån och skulder."
        icon={Landmark}
      />
    </NavigationPage>
  );
}
