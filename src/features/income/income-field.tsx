import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <Label htmlFor="monthly-net-income">
        Din månadsinkomst efter skatt (valfritt)
      </Label>
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
          aria-describedby={`income-description${error ? " income-error" : ""}`}
          className="pr-20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          kr/mån
        </span>
      </div>
      <p
        id="income-description"
        className="text-xs leading-relaxed text-muted-foreground"
      >
        Ange din vanliga nettoinkomst i SEK. Lämna tomt om du vill ange den
        senare. Du kan ändra eller ta bort beloppet i inställningarna.
      </p>
      {error ? (
        <p id="income-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
