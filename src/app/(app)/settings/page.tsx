import { Settings } from "lucide-react";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const metadata = { title: "Inställningar" };

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Anpassa Hemekonomi"
      description="Här kommer du att kunna administrera ekonomiska konton, hushållets uppgifter och ditt användarkonto."
      icon={Settings}
      sections={["Ekonomiska konton", "Hushåll", "Användarkonto"]}
    />
  );
}
