import { TrendingUp } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Investeringar" };

export default function InvestmentsPage() {
  return (
    <FeaturePlaceholder
      title="Samla hushållets investeringar"
      description="Här kommer du att få en gemensam bild av investeringarnas värde, fördelning och utveckling över tid."
      icon={TrendingUp}
      sections={["Totalt marknadsvärde", "Fördelning", "Värdeutveckling"]}
    />
  );
}
