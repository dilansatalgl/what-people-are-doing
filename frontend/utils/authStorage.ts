type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  multiRemove(keys: string[]): Promise<void>;
};

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";

const getAsyncStorage = async (): Promise<SessionStorage> => {
  const asyncStorageModule = await import(
    "@react-native-async-storage/async-storage"
  );

  return asyncStorageModule.default;
};

export const normalizeAuthToken = (token: string | null | undefined) => {
  if (typeof token !== "string") {
    return null;
  }

  const normalizedToken = token.trim();

  return normalizedToken ? normalizedToken : null;
};

export const getAuthTokenFromStorage = async (storage: SessionStorage) => {
  const token = await storage.getItem(TOKEN_STORAGE_KEY);
  return normalizeAuthToken(token);
};

export const getAuthToken = async () => {
  const storage = await getAsyncStorage();
  return getAuthTokenFromStorage(storage);
};

export const clearAuthSessionInStorage = async (storage: SessionStorage) => {
  await storage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
};

export const clearAuthSession = async () => {
  const storage = await getAsyncStorage();
  await clearAuthSessionInStorage(storage);
};
