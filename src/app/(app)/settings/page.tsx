import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getMonthlyNetIncome } from "@/features/income/data";
import { incomeToInput } from "@/features/income/validation";
import { IncomeForm } from "./income-form";

export const metadata = { title: "Inställningar" };

export default async function SettingsPage() {
  const monthlyNetIncomeInOre = await getMonthlyNetIncome();
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Din inkomst</CardTitle>
        <CardDescription>
          Din vanliga månadsinkomst efter skatt, till exempel lön eller pension.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IncomeForm initialValue={incomeToInput(monthlyNetIncomeInOre)} />
      </CardContent>
    </Card>
  );
}
