import test from "node:test";
import assert from "node:assert/strict";

test("deliberate negative test for CI verification", () => {
  assert.strictEqual(1, 2, "Deliberate test failure for Task 4.4 CI verification");
});
