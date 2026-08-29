export const overview = {
  month: "Augusti 2026",
  incomeInOre: 62_800_00,
  fixedCostsInOre: 25_450_00,
  savingsInOre: 12_500_00,
  availableInOre: 24_850_00,
  daysUntilSalary: 9,
  plannedPercent: 78,
};

export const cashFlow = [
  { month: "Mar", in: 59_400, out: 42_800 },
  { month: "Apr", in: 61_200, out: 45_900 },
  { month: "Maj", in: 60_100, out: 43_500 },
  { month: "Jun", in: 64_300, out: 51_200 },
  { month: "Jul", in: 62_800, out: 44_100 },
  { month: "Aug", in: 62_800, out: 37_950 },
] as const;

export const upcoming = [
  {
    date: "22 aug",
    label: "Bolån",
    category: "Boende",
    amountInOre: 11_850_00,
  },
  {
    date: "24 aug",
    label: "El och nätavgift",
    category: "Boende",
    amountInOre: 1_640_00,
  },
  {
    date: "27 aug",
    label: "Gemensamt sparande",
    category: "Sparande",
    amountInOre: 4_000_00,
  },
] as const;

export const allocation = [
  { label: "Boende", amountInOre: 15_900_00, percent: 81, color: "bg-primary" },
  {
    label: "Mat & vardag",
    amountInOre: 8_200_00,
    percent: 64,
    color: "bg-chart-2",
  },
  {
    label: "Sparande",
    amountInOre: 12_500_00,
    percent: 100,
    color: "bg-chart-4",
  },
  {
    label: "Transport",
    amountInOre: 4_350_00,
    percent: 72,
    color: "bg-chart-3",
  },
] as const;

export const accounts = [
  { label: "Vardagskonto", type: "Likvida medel", amountInOre: 34_200_00 },
  { label: "Buffert", type: "Sparande", amountInOre: 86_500_00 },
  { label: "Investeringar", type: "Tillgång", amountInOre: 318_400_00 },
  { label: "Bolån", type: "Skuld", amountInOre: -1_842_000_00 },
] as const;

export const planRows = [
  {
    label: "Boende",
    destination: "Direkt",
    plannedInOre: 15_900_00,
    actualInOre: 12_780_00,
  },
  {
    label: "Mat & vardag",
    destination: "Direkt",
    plannedInOre: 8_200_00,
    actualInOre: 5_230_00,
  },
  {
    label: "Gemensamt sparande",
    destination: "Sparande",
    plannedInOre: 4_000_00,
    actualInOre: 4_000_00,
  },
  {
    label: "Resor",
    destination: "Avsatt",
    plannedInOre: 2_500_00,
    actualInOre: 2_500_00,
  },
] as const;

export const timeline = [
  { label: "Lön", day: "18", state: "done" },
  { label: "Räkningar", day: "22", state: "current" },
  { label: "Sparande", day: "27", state: "upcoming" },
  { label: "Nästa lön", day: "31", state: "upcoming" },
] as const;
