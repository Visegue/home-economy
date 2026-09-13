import { Landmark } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Balans" };

export default function BalancePage() {
  return (
    <FeaturePlaceholder
      title="Se hela hushållets balans"
      description="Här kommer konton, investeringar och andra tillgångar att vägas mot lån och skulder för att visa likviditet och nettoförmögenhet."
      icon={Landmark}
      sections={["Tillgångar", "Lån och skulder", "Total likviditet"]}
    />
  );
}
