import type { ReactionCounts, ReactionType } from "./reactionTypes";

export type ReactionChange = {
  postId: string;
  userReaction: ReactionType | null;
  reactionCounts: ReactionCounts;
};

type Listener = (change: ReactionChange) => void;

const listeners = new Set<Listener>();

export const publishReactionChange = (change: ReactionChange) => {
  listeners.forEach((listener) => listener(change));
};

export const subscribeToReactionChanges = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
