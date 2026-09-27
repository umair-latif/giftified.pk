import type { Messenger } from "./types";

/** Records outgoing messages instead of sending them. */
export function createMockMessenger() {
  const sent: { kind: "verification" | "vendor"; payload: unknown }[] = [];
  let n = 0;
  const messenger: Messenger = {
    async sendOrderVerification(req) {
      sent.push({ kind: "verification", payload: req });
      return { messageId: `mock-${++n}` };
    },
    async sendVendorAlert(alert) {
      sent.push({ kind: "vendor", payload: alert });
      return { messageId: `mock-${++n}` };
    },
    verifySubscription: (params) => params.get("hub.challenge"),
    async parseInbound(rawBody) {
      try {
        const parsed: unknown = JSON.parse(rawBody);
        return Array.isArray(parsed)
          ? (parsed as Awaited<ReturnType<Messenger["parseInbound"]>>)
          : null;
      } catch {
        return null;
      }
    },
  };
  return { messenger, sent };
}
