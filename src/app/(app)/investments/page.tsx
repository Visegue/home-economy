import { TrendingUp } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Investeringar" };

export default function InvestmentsPage() {
  return (
    <FeaturePlaceholder
      title="Investeringar"
      description="Värde, fördelning och utveckling."
      icon={TrendingUp}
    />
  );
}
