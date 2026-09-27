import "server-only";
import { createMockMessenger } from "./mock";
import type { Messenger } from "./types";

export type * from "./types";

let client: Messenger | undefined;

/** Uses the mock until WhatsApp Cloud API env vars are set (WhatsApp task wires the real one). */
export function getMessenger(): Messenger {
  client ??= createMockMessenger().messenger;
  return client;
}
