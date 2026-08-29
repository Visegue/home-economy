import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";

import { KpiCard } from "./kpi-card";

describe("KpiCard", () => {
  it("visar etikett, belopp och förklaring", () => {
    render(
      <KpiCard
        label="Kvar efter plan"
        value="24 850 kr"
        detail="9 dagar till lön"
        icon={Wallet}
      />,
    );

    expect(screen.getByText("Kvar efter plan")).toBeInTheDocument();
    expect(screen.getByText("24 850 kr")).toBeInTheDocument();
    expect(screen.getByText("9 dagar till lön")).toBeInTheDocument();
  });
});
