import { createRateLimiter } from "@/features/orders/rate-limit";

/** Review endpoints: 20 requests per IP per hour (in memory, like /track). */
export const reviewLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
});
