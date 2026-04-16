const test = require("node:test");
const assert = require("node:assert/strict");

test("normalizeAuthToken returns null for empty values and trims valid tokens", async () => {
  const { normalizeAuthToken } = await import("../utils/authStorage.ts");

  assert.equal(normalizeAuthToken(null), null);
  assert.equal(normalizeAuthToken(undefined), null);
  assert.equal(normalizeAuthToken("   "), null);
  assert.equal(normalizeAuthToken("  abc123  "), "abc123");
});

test("getAuthTokenFromStorage reads and normalizes the saved token", async () => {
  const { getAuthTokenFromStorage } = await import("../utils/authStorage.ts");
  const storage = {
    getItem: async (key) => {
      assert.equal(key, "token");
      return "  saved-token  ";
    },
    multiRemove: async () => {},
  };

  const token = await getAuthTokenFromStorage(storage);

  assert.equal(token, "saved-token");
});

test("clearAuthSessionInStorage removes token and user keys", async () => {
  const { clearAuthSessionInStorage } = await import("../utils/authStorage.ts");
  let removedKeys;
  const storage = {
    getItem: async () => null,
    multiRemove: async (keys) => {
      removedKeys = keys;
    },
  };

  await clearAuthSessionInStorage(storage);

  assert.deepEqual(removedKeys, ["token", "user"]);
});
