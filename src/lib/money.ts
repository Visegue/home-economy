const sekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatSek(amountInOre: number): string {
  return sekFormatter.format(amountInOre / 100);
}
