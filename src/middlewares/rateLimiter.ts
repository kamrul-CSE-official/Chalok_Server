import { Request, Response } from "express";
import {
  rateLimit,
  RateLimitRequestHandler,
  Options,
} from "express-rate-limit";

// Define supported time units
export type TimeUnit = "sec" | "min" | "hour" | "day";

// Interface for helper configuration
export interface DynamicLimiterConfig {
  /** The duration value for the rate-limiting window */
  time?: number;
  /** Unit of time ('sec' | 'min' | 'hour' | 'day'). Defaults to 'min' */
  unit?: TimeUnit;
  /** Maximum number of connections allowed within the windowMs */
  limit?: number;
  /** Custom error message returned when limit is exceeded */
  message?: string;
}

// Custom error response body structure
export interface RateLimitResponseBody {
  status: number;
  error: string;
  message: string;
  retryAfter: string;
}

/**
 * Creates a customized Express Rate Limit middleware using dynamic parameters.
 */
export const createDynamicLimiter = ({
  time = 15,
  unit = "min",
  limit = 100,
  message = "Too many requests, please try again later.",
}: DynamicLimiterConfig = {}): RateLimitRequestHandler => {
  // Convert time units to milliseconds with strict typing
  const timeMultipliers: Record<TimeUnit, number> = {
    sec: 1000,
    min: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  const windowMs = time * (timeMultipliers[unit] ?? timeMultipliers.min);

  const responseBody: RateLimitResponseBody = {
    status: 429,
    error: "Too Many Requests",
    message,
    retryAfter: `${time} ${unit}`,
  };

  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: responseBody,
  };

  return rateLimit(options);
};

export default createDynamicLimiter;
