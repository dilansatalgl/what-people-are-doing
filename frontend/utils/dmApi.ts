import { API_BASE_URL } from "../constants/api";
import { getAuthToken } from "./authStorage";
import type {
  DmConversationPage,
  DmMessage,
  DmThread,
  DmThreadPage,
  DmUnreadSummary,
  DmViewerRole,
} from "./dmTypes";

type DmRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

type RawDmThread = {
  id?: string;
  _id?: string;
  postId?: string;
  post?: string;
  viewerRole?: DmViewerRole;
  otherPartyName?: string | null;
  creatorRevealed?: boolean;
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
};

type RawDmMessage = {
  id?: string;
  _id?: string;
  text?: string;
  sentByViewer?: boolean;
  createdAt?: string;
};

export class DmApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "DmApiError";
    this.status = status;
  }
}

const normalizeStringId = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const normalizeThread = (thread: RawDmThread): DmThread => ({
  id: normalizeStringId(thread.id ?? thread._id),
  postId: normalizeStringId(thread.postId ?? thread.post),
  viewerRole: thread.viewerRole === "creator" ? "creator" : "initiator",
  otherPartyName:
    typeof thread.otherPartyName === "string" ? thread.otherPartyName : null,
  creatorRevealed: Boolean(thread.creatorRevealed),
  lastMessagePreview:
    typeof thread.lastMessagePreview === "string"
      ? thread.lastMessagePreview
      : "",
  lastMessageAt:
    typeof thread.lastMessageAt === "string" ? thread.lastMessageAt : null,
  unreadCount:
    typeof thread.unreadCount === "number" && Number.isFinite(thread.unreadCount)
      ? Math.max(0, Math.floor(thread.unreadCount))
      : 0,
});

const normalizeMessage = (message: RawDmMessage): DmMessage => ({
  id: normalizeStringId(message.id ?? message._id),
  text: typeof message.text === "string" ? message.text : "",
  sentByViewer: Boolean(message.sentByViewer),
  createdAt:
    typeof message.createdAt === "string"
      ? message.createdAt
      : new Date().toISOString(),
});

const buildQuery = (params: Record<string, string | number | null | undefined>) => {
  const pairs = Object.entries(params).filter(([, value]) => value != null);
  if (pairs.length === 0) return "";

  const query = pairs
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");

  return `?${query}`;
};

const dmRequest = async <T>(
  path: string,
  { method = "GET", body }: DmRequestOptions = {},
): Promise<T> => {
  const token = await getAuthToken();
  if (!token) {
    throw new DmApiError("Please log in again.", 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new DmApiError(data.message || "DM request failed.", response.status);
  }

  return data as T;
};

export const fetchDmUnreadCount = async (): Promise<DmUnreadSummary> => {
  const data = await dmRequest<{
    unreadCount?: number;
    threadsWithUnread?: number;
  }>("/dm/unread-count");

  return {
    unreadCount:
      typeof data.unreadCount === "number" && Number.isFinite(data.unreadCount)
        ? Math.max(0, Math.floor(data.unreadCount))
        : 0,
    threadsWithUnread:
      typeof data.threadsWithUnread === "number" &&
      Number.isFinite(data.threadsWithUnread)
        ? Math.max(0, Math.floor(data.threadsWithUnread))
        : 0,
  };
};

export const fetchDmThreads = async ({
  before,
  limit = 30,
}: {
  before?: string | null;
  limit?: number;
} = {}): Promise<DmThreadPage> => {
  const data = await dmRequest<{
    threads?: RawDmThread[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }>(`/dm/threads${buildQuery({ before, limit })}`);

  return {
    threads: (data.threads ?? []).map(normalizeThread),
    nextCursor:
      typeof data.nextCursor === "string" ? data.nextCursor : null,
    hasMore: Boolean(data.hasMore),
  };
};

export const startDmThread = async (postId: string): Promise<DmThread> => {
  const data = await dmRequest<{ conversation?: RawDmThread }>(
    "/dm/threads",
    {
      method: "POST",
      body: { postId },
    },
  );

  if (!data.conversation) {
    throw new DmApiError("DM thread response was incomplete.");
  }

  return normalizeThread(data.conversation);
};

export const fetchDmConversation = async (
  threadId: string,
  {
    before,
    limit = 30,
  }: {
    before?: string | null;
    limit?: number;
  } = {},
): Promise<DmConversationPage> => {
  const data = await dmRequest<{
    conversation?: RawDmThread;
    messages?: RawDmMessage[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }>(`/dm/threads/${threadId}${buildQuery({ before, limit })}`);

  if (!data.conversation) {
    throw new DmApiError("DM conversation response was incomplete.");
  }

  return {
    thread: normalizeThread(data.conversation),
    messages: (data.messages ?? []).map(normalizeMessage),
    nextCursor:
      typeof data.nextCursor === "string" ? data.nextCursor : null,
    hasMore: Boolean(data.hasMore),
  };
};

export const markDmThreadRead = async (threadId: string) => {
  await dmRequest<{ success?: boolean }>(`/dm/threads/${threadId}/read`, {
    method: "POST",
  });
};

export const sendDmMessage = async (
  threadId: string,
  text: string,
): Promise<DmMessage> => {
  const data = await dmRequest<{ message?: RawDmMessage }>(
    `/dm/threads/${threadId}/messages`,
    {
      method: "POST",
      body: { text },
    },
  );

  if (!data.message) {
    throw new DmApiError("Message response was incomplete.");
  }

  return normalizeMessage(data.message);
};
