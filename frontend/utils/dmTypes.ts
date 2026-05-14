export type DmViewerRole = "creator" | "initiator";

export type DmThread = {
  id: string;
  postId: string;
  viewerRole: DmViewerRole;
  otherPartyName: string | null;
  creatorRevealed: boolean;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type DmMessage = {
  id: string;
  text: string;
  sentByViewer: boolean;
  createdAt: string;
};

export type DmUnreadSummary = {
  unreadCount: number;
  threadsWithUnread: number;
};

export type DmThreadPage = {
  threads: DmThread[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type DmConversationPage = {
  thread: DmThread;
  messages: DmMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};
