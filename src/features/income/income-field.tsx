import { Input } from "@home-economy/ui/form";
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
    <div className="ui-field">
      <div className="flex flex-wrap items-center gap-1">
        <Label htmlFor="monthly-net-income">
          Din månadsinkomst efter skatt (valfritt)
        </Label>
        <InfoButton title="Din månadsinkomst">
          <p>
            Ange din vanliga inkomst efter skatt till månadsbudgeten. Du kan
            lämna tomt och lägga till inkomster senare i inställningarna.
          </p>
        </InfoButton>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-40">
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
          />
        </div>
        <span className="text-xs text-muted-foreground">kr/mån</span>
      </div>
      {error ? (
        <p id="income-error" role="alert" className="ui-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
