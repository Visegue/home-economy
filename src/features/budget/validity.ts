import { periodSchema } from "./model";

export function periodDate(period: string) {
  return new Date(`${periodSchema.parse(period)}-01T00:00:00Z`);
}
