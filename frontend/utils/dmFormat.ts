import type { DmThread } from "./dmTypes";

export const MAX_DM_MESSAGE_LENGTH = 1000;

export const ANONYMOUS_DM_NAME = "Anonymous";

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isYesterday = (date: Date, now: Date) => {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameCalendarDay(date, yesterday);
};

export const getDmDisplayName = (name: string | null | undefined) => {
  const trimmedName = name?.trim();
  return trimmedName ? trimmedName : ANONYMOUS_DM_NAME;
};

export const hasDmThreadMessages = (thread: DmThread) =>
  Boolean(thread.lastMessageAt || thread.lastMessagePreview.trim());

export const formatDmTimestamp = (
  value: string | null | undefined,
  now = new Date(),
) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < MS_PER_MINUTE) return "now";
  if (diffMs >= 0 && diffMs < MS_PER_HOUR) {
    return `${Math.max(1, Math.floor(diffMs / MS_PER_MINUTE))}m`;
  }
  if (isSameCalendarDay(date, now)) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (isYesterday(date, now)) return "Yesterday";
  if (now.getTime() - date.getTime() < 7 * MS_PER_DAY) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDmMessageTime = (value: string | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const normalizeDmMessageText = (text: string) => text.trim();

export const getDmMessageValidation = (text: string) => {
  const trimmedText = normalizeDmMessageText(text);

  if (!trimmedText) {
    return {
      trimmedText,
      isValid: false,
      errorMessage: "Message cannot be empty.",
    };
  }

  if (trimmedText.length > MAX_DM_MESSAGE_LENGTH) {
    return {
      trimmedText,
      isValid: false,
      errorMessage: `Message must be ${MAX_DM_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return {
    trimmedText,
    isValid: true,
    errorMessage: null,
  };
};
