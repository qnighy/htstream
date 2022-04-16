import { expect, test } from "@jest/globals";
import { something } from "./index";

test("something", () => {
  expect(something()).toBe(42);
});
