export type EchoChange = {
  postId: string;
  hasEchoed: boolean;
  echoCount: number;
};

type Listener = (change: EchoChange) => void;

const listeners = new Set<Listener>();

export const publishEchoChange = (change: EchoChange) => {
  listeners.forEach((listener) => listener(change));
};

export const subscribeToEchoChanges = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
