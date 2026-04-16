const test = require("node:test");
const assert = require("node:assert/strict");

test("getDeleteAccountOutcome maps 200 to deleted", async () => {
  const { getDeleteAccountOutcome } = await import("../utils/manageAccount.ts");

  assert.equal(getDeleteAccountOutcome(200), "deleted");
});

test("getDeleteAccountOutcome maps 401 and 404 to session-ended", async () => {
  const { getDeleteAccountOutcome } = await import("../utils/manageAccount.ts");

  assert.equal(getDeleteAccountOutcome(401), "session-ended");
  assert.equal(getDeleteAccountOutcome(404), "session-ended");
});

test("getDeleteAccountOutcome maps other statuses to error", async () => {
  const { getDeleteAccountOutcome } = await import("../utils/manageAccount.ts");

  assert.equal(getDeleteAccountOutcome(400), "error");
  assert.equal(getDeleteAccountOutcome(500), "error");
});
