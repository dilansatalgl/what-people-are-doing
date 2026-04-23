import Constants from "expo-constants";

const DEFAULT_API_PORT = "3000";
const DEFAULT_API_PATH = "/api";
const LOCALHOST_API_BASE_URL = `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
const DEFAULT_FEED_POLL_INTERVAL_MS = 3600000;

const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
};

const normalizeFeedPollInterval = (value: string | undefined) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
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

export const FEED_POLL_INTERVAL_MS =
  normalizeFeedPollInterval(process.env.EXPO_PUBLIC_FEED_POLL_INTERVAL_MS) ??
  DEFAULT_FEED_POLL_INTERVAL_MS;
