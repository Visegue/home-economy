const sekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatSek(amountInOre: number): string {
  return sekFormatter.format(amountInOre / 100);
}

// Budget transfers must show öre so the displayed rows add up to the total.
const budgetSekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBudgetSek(amountInOre: number): string {
  return budgetSekFormatter.format(amountInOre / 100);
}
