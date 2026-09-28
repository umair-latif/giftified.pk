import { serve } from "inngest/next";
import { inngest } from "@/server/jobs/client";
import { functions } from "@/server/jobs/functions";

/** Inngest calls this endpoint to run job steps (one line's render per call). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
