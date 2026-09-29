import type { EmailMessage, EmailSender } from "./types";

/** Keeps sent mail in memory for tests; in dev it also prints it so the link can be opened. */
export function createMockEmail(log = false): EmailSender & {
  sent: EmailMessage[];
} {
  const sent: EmailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
      if (log) console.info(`[email:mock] to ${message.to}\n${message.text}`);
    },
  };
}
