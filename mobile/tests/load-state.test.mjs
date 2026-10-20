import { test } from "node:test";
import assert from "node:assert/strict";
import { initialLoad, loadState } from "../src/lib/load-state.ts";
test("successful loading dismisses the spinner", () =>
  assert.equal(loadState(initialLoad, { type: "finish" }).phase, "ready"));
test("onLoadEnd after an HTTP/connection error does not hide recovery", () => {
  const error = loadState(initialLoad, {
    type: "error",
    message: "Connection failed",
  });
  assert.deepEqual(loadState(error, { type: "finish" }), error);
});
test("explicit retry clears a prior error and resets the timeout generation", () => {
  const error = loadState(initialLoad, {
    type: "error",
    message: "Connection failed",
  });
  const retry = loadState(error, { type: "start" });
  assert.equal(retry.phase, "loading");
  assert.equal(retry.message, null);
  assert.equal(retry.attempt, 1);
  assert.equal(loadState(retry, { type: "start" }).attempt, 2);
});
