import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoButton } from "@/components/info-button";

export function IncomeField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label htmlFor="monthly-net-income">
          Din månadsinkomst efter skatt (valfritt)
        </Label>
        <InfoButton title="Din månadsinkomst">
          <p>
            Din vanliga inkomst efter skatt används i månadsbudgeten. Du kan
            lämna fältet tomt och lägga till inkomster senare i inställningarna.
          </p>
        </InfoButton>
      </div>
      <div className="relative">
        <Input
          id="monthly-net-income"
          name="monthlyNetIncome"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Till exempel 32 500"
          maxLength={24}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "income-error" : undefined}
          className="pr-20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          kr/mån
        </span>
      </div>
      {error ? (
        <p id="income-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
