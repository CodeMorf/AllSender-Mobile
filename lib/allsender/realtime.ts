/** Normalized event shape emitted by Pusher, with polling as a fallback. */
export type RealtimeEvent = {
  event: string;
  channel?: string;
  data: unknown;
};
