import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DmApiError,
  fetchDmThreads,
  fetchDmUnreadCount,
} from "../../utils/dmApi";
import {
  formatDmTimestamp,
  getDmDisplayName,
  hasDmThreadMessages,
} from "../../utils/dmFormat";
import { setDmUnreadCount } from "../../utils/dmStore";
import type { DmThread } from "../../utils/dmTypes";

const THREAD_PAGE_SIZE = 30;
const DM_POLL_INTERVAL_MS = 15000;

const mergeThreads = (current: DmThread[], incoming: DmThread[]) => {
  const byId = new Map<string, DmThread>();
  current.forEach((thread) => byId.set(thread.id, thread));
  incoming
    .filter(hasDmThreadMessages)
    .forEach((thread) => byId.set(thread.id, thread));
  return Array.from(byId.values());
};

export default function DmThreadListScreen() {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadedOnce = useRef(false);
  const requestInFlight = useRef(false);
  const loadingMoreInFlight = useRef(false);
  const hasMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);

  const handleUnauthorized = useCallback((error: unknown) => {
    if (error instanceof DmApiError && error.status === 401) {
      router.replace("/login");
      return true;
    }

    return false;
  }, []);

  const loadFirstPage = useCallback(
    async ({
      showLoading = false,
      showRefreshing = false,
      silent = false,
    }: {
      showLoading?: boolean;
      showRefreshing?: boolean;
      silent?: boolean;
    } = {}) => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;

      if (showLoading) setLoading(true);
      if (showRefreshing) setRefreshing(true);
      if (!silent) setErrorMessage(null);

      try {
        const [page, unreadSummary] = await Promise.all([
          fetchDmThreads({ limit: THREAD_PAGE_SIZE }),
          fetchDmUnreadCount(),
        ]);

        setThreads(page.threads.filter(hasDmThreadMessages));
        nextCursorRef.current = page.nextCursor;
        hasMoreRef.current = page.hasMore;
        setDmUnreadCount(unreadSummary.unreadCount);
        loadedOnce.current = true;
      } catch (error) {
        if (!handleUnauthorized(error) && !silent) {
          setErrorMessage(
            error instanceof DmApiError
              ? error.message
              : "Could not load messages.",
          );
        }
      } finally {
        requestInFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleUnauthorized],
  );

  const loadMoreThreads = useCallback(async () => {
    if (
      loadingMoreInFlight.current ||
      !hasMoreRef.current ||
      !nextCursorRef.current
    ) {
      return;
    }

    loadingMoreInFlight.current = true;
    setLoadingMore(true);

    try {
      const page = await fetchDmThreads({
        before: nextCursorRef.current,
        limit: THREAD_PAGE_SIZE,
      });
      setThreads((prev) => mergeThreads(prev, page.threads));
      nextCursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
    } catch (error) {
      handleUnauthorized(error);
    } finally {
      loadingMoreInFlight.current = false;
      setLoadingMore(false);
    }
  }, [handleUnauthorized]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage({
        showLoading: !loadedOnce.current,
        silent: loadedOnce.current,
      });

      const timer = setInterval(() => {
        void loadFirstPage({ silent: true });
      }, DM_POLL_INTERVAL_MS);

      return () => clearInterval(timer);
    }, [loadFirstPage]),
  );

  const renderThread: ListRenderItem<DmThread> = ({ item }) => {
    const unread = item.unreadCount > 0;
    const displayName = getDmDisplayName(item.otherPartyName);
    const preview = item.lastMessagePreview || "No messages yet";
    const timestamp = formatDmTimestamp(item.lastMessageAt);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.threadRow,
          unread && styles.threadRowUnread,
          pressed && styles.threadRowPressed,
        ]}
        onPress={() =>
          router.push({
            pathname: "/dm/[threadId]" as any,
            params: { threadId: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${displayName}`}
      >
        <View style={[styles.avatar, unread && styles.avatarUnread]}>
          <Text style={[styles.avatarText, unread && styles.avatarTextUnread]}>
            {displayName.slice(0, 1)}
          </Text>
        </View>

        <View style={styles.threadMain}>
          <View style={styles.threadTitleRow}>
            <Text
              style={[styles.threadName, unread && styles.threadNameUnread]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {timestamp ? <Text style={styles.threadTime}>{timestamp}</Text> : null}
          </View>

          <View style={styles.previewRow}>
            <Text
              style={[styles.threadPreview, unread && styles.threadPreviewUnread]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {unread ? (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateText}>Loading messages...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="alert-circle-outline" size={28} color="#F3D0D0" />
          </View>
          <Text style={styles.stateTitle}>Could not load messages</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => void loadFirstPage({ showLoading: true })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={[
            styles.listContent,
            threads.length === 0 && styles.emptyListContent,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#FFFFFF"
              onRefresh={() => void loadFirstPage({ showRefreshing: true })}
            />
          }
          onEndReached={() => void loadMoreThreads()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color="#EAEAEA" />
              </View>
              <Text style={styles.stateTitle}>No messages yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  separator: {
    height: 10,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    padding: 14,
  },
  threadRowUnread: {
    borderColor: "#363636",
    backgroundColor: "#161616",
  },
  threadRowPressed: {
    opacity: 0.74,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#303030",
  },
  avatarUnread: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  avatarTextUnread: {
    color: "#000000",
  },
  threadMain: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  threadTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  threadName: {
    flex: 1,
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "700",
  },
  threadNameUnread: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  threadTime: {
    color: "#8D8D8D",
    fontSize: 12,
    lineHeight: 16,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threadPreview: {
    flex: 1,
    color: "#8F8F8F",
    fontSize: 13,
    lineHeight: 18,
  },
  threadPreviewUnread: {
    color: "#D7D7D7",
    fontWeight: "700",
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "#FFFFFF",
  },
  unreadPillText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyState: {
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
    marginTop: 4,
  },
  retryButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
