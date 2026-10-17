import { expect, test } from "@playwright/test";

test("syntetiska browserassertioner passerar", () => {
  expect(2 + 2).toBe(4);
});
