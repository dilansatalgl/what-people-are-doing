export const REACTION_TYPES = [
  "love",
  "laugh",
  "wow",
  "sad",
  "cry",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  cry: "😭",
};

export type ReactionCounts = Record<ReactionType, number>;

export const emptyReactionCounts = (): ReactionCounts =>
  REACTION_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as ReactionCounts);

export const totalReactionCount = (counts: ReactionCounts) =>
  REACTION_TYPES.reduce((sum, type) => sum + (counts[type] ?? 0), 0);

export const topReaction = (
  counts: ReactionCounts,
): { type: ReactionType; count: number } | null => {
  let best: { type: ReactionType; count: number } | null = null;
  for (const type of REACTION_TYPES) {
    const count = counts[type] ?? 0;
    if (count > 0 && (!best || count > best.count)) {
      best = { type, count };
    }
  }
  return best;
};
