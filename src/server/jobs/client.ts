import "server-only";
import { Inngest } from "inngest";

/**
 * The one Inngest client. In production the Vercel integration sets
 * INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY; locally run the Inngest dev
 * server (`npx inngest-cli@latest dev`) with INNGEST_DEV=1.
 */
export const inngest = new Inngest({ id: "giftified" });
