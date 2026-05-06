type DmUnreadListener = (unreadCount: number) => void;

const unreadListeners = new Set<DmUnreadListener>();
let unreadCountSnapshot = 0;

export const normalizeDmUnreadCount = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const formatDmUnreadBadge = (value: number) => {
  const normalizedValue = normalizeDmUnreadCount(value);
  if (normalizedValue === 0) return undefined;
  return normalizedValue > 99 ? "99+" : String(normalizedValue);
};

export const getDmUnreadCountSnapshot = () => unreadCountSnapshot;

export const setDmUnreadCount = (nextCount: number) => {
  const normalizedCount = normalizeDmUnreadCount(nextCount);
  if (normalizedCount === unreadCountSnapshot) return;

  unreadCountSnapshot = normalizedCount;
  unreadListeners.forEach((listener) => listener(unreadCountSnapshot));
};

export const adjustDmUnreadCount = (delta: number) => {
  setDmUnreadCount(unreadCountSnapshot + delta);
};

export const subscribeToDmUnreadCount = (listener: DmUnreadListener) => {
  unreadListeners.add(listener);
  return () => {
    unreadListeners.delete(listener);
  };
};
