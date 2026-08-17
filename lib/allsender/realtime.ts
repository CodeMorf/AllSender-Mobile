/**
 * Event shape reserved for the future Pusher/WebSocket transport.
 * The current production API is intentionally using foreground sync because
 * auth.allsender.tech does not expose a Pusher auth endpoint in the audited
 * Postman contract.
 */
export type RealtimeEvent = {
  event: string;
  channel?: string;
  data: unknown;
};
