const test = require("node:test");
const assert = require("node:assert/strict");

test("formatDmTimestamp returns compact relative labels", async () => {
  const { formatDmTimestamp } = await import("../utils/dmFormat.ts");
  const now = new Date("2026-05-06T12:00:00.000Z");

  assert.equal(formatDmTimestamp("2026-05-06T11:59:30.000Z", now), "now");
  assert.equal(formatDmTimestamp("2026-05-06T11:55:00.000Z", now), "5m");
  assert.equal(
    formatDmTimestamp("2026-05-05T12:00:00.000Z", now),
    "Yesterday",
  );
  assert.equal(formatDmTimestamp("not-a-date", now), "");
});

test("getDmMessageValidation trims text and rejects empty or long messages", async () => {
  const {
    getDmMessageValidation,
    MAX_DM_MESSAGE_LENGTH,
  } = await import("../utils/dmFormat.ts");

  assert.deepEqual(getDmMessageValidation("  hello  "), {
    trimmedText: "hello",
    isValid: true,
    errorMessage: null,
  });

  const empty = getDmMessageValidation("   ");
  assert.equal(empty.isValid, false);
  assert.equal(empty.trimmedText, "");

  const tooLong = getDmMessageValidation("x".repeat(MAX_DM_MESSAGE_LENGTH + 1));
  assert.equal(tooLong.isValid, false);
});

test("getDmDisplayName falls back to Anonymous", async () => {
  const { getDmDisplayName } = await import("../utils/dmFormat.ts");

  assert.equal(getDmDisplayName(null), "Anonymous");
  assert.equal(getDmDisplayName("  "), "Anonymous");
  assert.equal(getDmDisplayName("alice"), "alice");
});

test("hasDmThreadMessages hides threads without a sent message", async () => {
  const { hasDmThreadMessages } = await import("../utils/dmFormat.ts");
  const baseThread = {
    id: "thread-1",
    postId: "post-1",
    viewerRole: "initiator",
    otherPartyName: "Anonymous",
    creatorRevealed: false,
    lastMessagePreview: "",
    lastMessageAt: null,
    unreadCount: 0,
  };

  assert.equal(hasDmThreadMessages(baseThread), false);
  assert.equal(
    hasDmThreadMessages({
      ...baseThread,
      lastMessagePreview: "hello",
    }),
    true,
  );
  assert.equal(
    hasDmThreadMessages({
      ...baseThread,
      lastMessageAt: "2026-05-06T12:00:00.000Z",
    }),
    true,
  );
});
