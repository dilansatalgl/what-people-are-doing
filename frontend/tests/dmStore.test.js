const test = require("node:test");
const assert = require("node:assert/strict");

test("formatDmUnreadBadge hides zero and caps large counts", async () => {
  const { formatDmUnreadBadge } = await import("../utils/dmStore.ts");

  assert.equal(formatDmUnreadBadge(0), undefined);
  assert.equal(formatDmUnreadBadge(7), "7");
  assert.equal(formatDmUnreadBadge(120), "99+");
});

test("dm unread store normalizes, publishes, and clamps updates", async () => {
  const {
    adjustDmUnreadCount,
    getDmUnreadCountSnapshot,
    setDmUnreadCount,
    subscribeToDmUnreadCount,
  } = await import("../utils/dmStore.ts");

  const seen = [];
  const unsubscribe = subscribeToDmUnreadCount((count) => {
    seen.push(count);
  });

  setDmUnreadCount(2.8);
  adjustDmUnreadCount(3);
  adjustDmUnreadCount(-20);
  unsubscribe();
  setDmUnreadCount(4);

  assert.deepEqual(seen, [2, 5, 0]);
  assert.equal(getDmUnreadCountSnapshot(), 4);
});
