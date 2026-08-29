export * from "./auth";
export * from "./finance";

import * as authSchema from "./auth";
import * as financeSchema from "./finance";

export const schema = { ...authSchema, ...financeSchema };
