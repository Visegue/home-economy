import { Landmark } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Balans" };

export default function BalancePage() {
  return (
    <FeaturePlaceholder
      title="Balans"
      description="Tillgångar, lån och skulder."
      icon={Landmark}
    />
  );
}
