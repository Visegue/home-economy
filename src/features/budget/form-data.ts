export function expenseFormValues(data: FormData) {
  return {
    mode: data.get("mode") ?? undefined,
    revision: data.get("revision") ?? undefined,
    scheduledDay: data.get("scheduledDay") ?? undefined,
    name: data.get("name"),
    amount: data.get("amount"),
    period: data.get("period"),
    type: data.get("type"),
    months: data.get("months"),
    nextDueOn: data.get("nextDueOn") ?? "",
    ownerIds: data.getAll("ownerIds"),
    settlement:
      data.get("type") === "settlement"
        ? {
            markupAmountInOre:
              data.get("markupEnabled") === "on" &&
              data.get("markupType") === "amount"
                ? data.get("markup")
                : null,
            markupPercent:
              data.get("markupEnabled") === "on" &&
              data.get("markupType") === "percent"
                ? data.get("markup")
                : null,
            inflationPercent:
              data.get("inflationEnabled") === "on"
                ? data.get("inflation")
                : null,
          }
        : undefined,
  };
}
