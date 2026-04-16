import Constants from "expo-constants";

const DEFAULT_API_PORT = "3000";
const DEFAULT_API_PATH = "/api";
const LOCALHOST_API_BASE_URL = `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;

const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
};

const getExpoHost = () => {
  const hostSource =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;

  if (!hostSource) {
    return null;
  }

  const [host] = hostSource.split(":");
  return host || null;
};

export const API_BASE_URL =
  normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL) ||
  (getExpoHost()
    ? `http://${getExpoHost()}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
    : LOCALHOST_API_BASE_URL);
