import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DmApiError,
  fetchDmConversation,
  fetchDmUnreadCount,
  markDmThreadRead,
  sendDmMessage,
} from "../../utils/dmApi";
import {
  formatDmMessageTime,
  getDmDisplayName,
  getDmMessageValidation,
  MAX_DM_MESSAGE_LENGTH,
} from "../../utils/dmFormat";
import {
  setDmUnreadCount,
} from "../../utils/dmStore";
import type { DmMessage, DmThread } from "../../utils/dmTypes";

const MESSAGE_PAGE_SIZE = 30;
const DM_POLL_INTERVAL_MS = 12000;

const getStringParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
};

const sortMessagesAscending = (messages: DmMessage[]) =>
  [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

const mergeMessagesAscending = (
  current: DmMessage[],
  incoming: DmMessage[],
) => {
  const byId = new Map<string, DmMessage>();
  current.forEach((message) => byId.set(message.id, message));
  incoming.forEach((message) => byId.set(message.id, message));
  return sortMessagesAscending(Array.from(byId.values()));
};

export default function DmConversationScreen() {
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = getStringParam(params.threadId);

  const [thread, setThread] = useState<DmThread | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadedOnce = useRef(false);
  const requestInFlight = useRef(false);
  const markReadInFlight = useRef(false);
  const listRef = useRef<FlatList<DmMessage> | null>(null);
  const shouldScrollToEnd = useRef(false);
  const hasMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);

  const validation = useMemo(() => getDmMessageValidation(draft), [draft]);
  const canSend = validation.isValid && !sending && Boolean(threadId);
  const displayName = getDmDisplayName(thread?.otherPartyName);

  const handleUnauthorized = useCallback((error: unknown) => {
    if (error instanceof DmApiError && error.status === 401) {
      router.replace("/login");
      return true;
    }

    return false;
  }, []);

  const markCurrentThreadRead = useCallback(
    async (unreadCount: number) => {
      if (!threadId || unreadCount <= 0 || markReadInFlight.current) return;

      markReadInFlight.current = true;
      try {
        await markDmThreadRead(threadId);
        const unreadSummary = await fetchDmUnreadCount();
        setDmUnreadCount(unreadSummary.unreadCount);
        setThread((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));
      } catch (error) {
        handleUnauthorized(error);
      } finally {
        markReadInFlight.current = false;
      }
    },
    [handleUnauthorized, threadId],
  );

  const loadConversation = useCallback(
    async ({
      showLoading = false,
      silent = false,
      scrollToEnd = false,
    }: {
      showLoading?: boolean;
      silent?: boolean;
      scrollToEnd?: boolean;
    } = {}) => {
      if (!threadId || requestInFlight.current) return;

      requestInFlight.current = true;
      shouldScrollToEnd.current = scrollToEnd;
      if (showLoading) setLoading(true);
      if (!silent) {
        setErrorMessage(null);
        setSendError(null);
      }

      try {
        const page = await fetchDmConversation(threadId, {
          limit: MESSAGE_PAGE_SIZE,
        });
        setThread(page.thread);
        setMessages((prev) =>
          loadedOnce.current
            ? mergeMessagesAscending(prev, page.messages)
            : sortMessagesAscending(page.messages),
        );
        setHasMore(page.hasMore);
        nextCursorRef.current = page.nextCursor;
        hasMoreRef.current = page.hasMore;
        loadedOnce.current = true;
        void markCurrentThreadRead(page.thread.unreadCount);
      } catch (error) {
        if (!handleUnauthorized(error) && !silent) {
          setErrorMessage(
            error instanceof DmApiError
              ? error.message
              : "Could not load this conversation.",
          );
        }
      } finally {
        requestInFlight.current = false;
        setLoading(false);
      }
    },
    [handleUnauthorized, markCurrentThreadRead, threadId],
  );

  const loadOlderMessages = useCallback(async () => {
    if (
      !threadId ||
      loadingOlder ||
      !hasMoreRef.current ||
      !nextCursorRef.current
    ) {
      return;
    }

    setLoadingOlder(true);

    try {
      const page = await fetchDmConversation(threadId, {
        before: nextCursorRef.current,
        limit: MESSAGE_PAGE_SIZE,
      });
      setThread(page.thread);
      setMessages((prev) => mergeMessagesAscending(prev, page.messages));
      setHasMore(page.hasMore);
      nextCursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      void markCurrentThreadRead(page.thread.unreadCount);
    } catch (error) {
      handleUnauthorized(error);
    } finally {
      setLoadingOlder(false);
    }
  }, [handleUnauthorized, loadingOlder, markCurrentThreadRead, threadId]);

  useFocusEffect(
    useCallback(() => {
      void loadConversation({
        showLoading: !loadedOnce.current,
        silent: loadedOnce.current,
        scrollToEnd: !loadedOnce.current,
      });

      const timer = setInterval(() => {
        void loadConversation({ silent: true });
      }, DM_POLL_INTERVAL_MS);

      return () => clearInterval(timer);
    }, [loadConversation]),
  );

  const handleSend = async () => {
    if (!threadId || sending) return;

    const nextValidation = getDmMessageValidation(draft);
    if (!nextValidation.isValid) {
      setSendError(nextValidation.errorMessage);
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const sentMessage = await sendDmMessage(
        threadId,
        nextValidation.trimmedText,
      );
      shouldScrollToEnd.current = true;
      setMessages((prev) => mergeMessagesAscending(prev, [sentMessage]));
      setDraft("");

      const [page, unreadSummary] = await Promise.all([
        fetchDmConversation(threadId, { limit: MESSAGE_PAGE_SIZE }),
        fetchDmUnreadCount(),
      ]);
      setThread(page.thread);
      setMessages((prev) => mergeMessagesAscending(prev, page.messages));
      setHasMore(page.hasMore);
      nextCursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setDmUnreadCount(unreadSummary.unreadCount);
    } catch (error) {
      if (!handleUnauthorized(error)) {
        setSendError(
          error instanceof DmApiError
            ? error.message
            : "Could not send message.",
        );
      }
    } finally {
      setSending(false);
    }
  };

  const renderMessage: ListRenderItem<DmMessage> = ({ item }) => {
    const outgoing = item.sentByViewer;

    return (
      <View
        style={[
          styles.messageRow,
          outgoing ? styles.messageRowOutgoing : styles.messageRowIncoming,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            outgoing
              ? styles.messageBubbleOutgoing
              : styles.messageBubbleIncoming,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              outgoing
                ? styles.messageTextOutgoing
                : styles.messageTextIncoming,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              outgoing
                ? styles.messageTimeOutgoing
                : styles.messageTimeIncoming,
            ]}
          >
            {formatDmMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (!threadId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Conversation unavailable</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#F5F5F5" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.stateText}>Loading conversation...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <Ionicons name="alert-circle-outline" size={28} color="#F3D0D0" />
            </View>
            <Text style={styles.stateTitle}>Could not open conversation</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() =>
                void loadConversation({ showLoading: true, scrollToEnd: true })
              }
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.messageList,
                messages.length === 0 && styles.emptyMessageList,
              ]}
              onContentSizeChange={() => {
                if (shouldScrollToEnd.current) {
                  listRef.current?.scrollToEnd({ animated: true });
                  shouldScrollToEnd.current = false;
                }
              }}
              ListHeaderComponent={
                hasMore ? (
                  <Pressable
                    style={styles.loadOlderButton}
                    onPress={() => void loadOlderMessages()}
                    disabled={loadingOlder}
                  >
                    {loadingOlder ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loadOlderText}>
                        Load older messages
                      </Text>
                    )}
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyConversation}>
                  <View style={styles.stateIcon}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={28}
                      color="#EAEAEA"
                    />
                  </View>
                  <Text style={styles.stateTitle}>Start the conversation</Text>
                </View>
              }
            />

            <View style={styles.composerWrap}>
              {sendError ? (
                <Text style={styles.sendErrorText}>{sendError}</Text>
              ) : null}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Message"
                  placeholderTextColor="#7E7E7E"
                  value={draft}
                  onChangeText={(value) => {
                    setDraft(value);
                    if (sendError) setSendError(null);
                  }}
                  multiline
                  maxLength={MAX_DM_MESSAGE_LENGTH + 20}
                  editable={!sending}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    !canSend && styles.sendButtonDisabled,
                  ]}
                  onPress={() => void handleSend()}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Ionicons name="send" size={18} color="#000000" />
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#252525",
  },
  headerTitle: {
    flex: 1,
    color: "#F5F5F5",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  emptyMessageList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  loadOlderButton: {
    alignSelf: "center",
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#252525",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  loadOlderText: {
    color: "#CFCFCF",
    fontSize: 13,
    fontWeight: "700",
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowIncoming: {
    justifyContent: "flex-start",
  },
  messageRowOutgoing: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  messageBubbleIncoming: {
    backgroundColor: "#171717",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#282828",
  },
  messageBubbleOutgoing: {
    backgroundColor: "#FFFFFF",
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextIncoming: {
    color: "#F2F2F2",
  },
  messageTextOutgoing: {
    color: "#000000",
  },
  messageTime: {
    alignSelf: "flex-end",
    fontSize: 10,
    lineHeight: 13,
  },
  messageTimeIncoming: {
    color: "#8B8B8B",
  },
  messageTimeOutgoing: {
    color: "#4F4F4F",
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: "#181818",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#050505",
    gap: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#252525",
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendErrorText: {
    color: "#F3D0D0",
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyConversation: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
  },
  stateTitle: {
    color: "#F5F5F5",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: "#9B9B9B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
});
