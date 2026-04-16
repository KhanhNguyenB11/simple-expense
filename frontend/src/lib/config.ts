/**
 * Typed front-end configuration.
 *
 * NEXT_PUBLIC_* variables are inlined at build time by Next.js.
 * All other env reads should go here so the rest of the app never
 * touches process.env directly.
 */
const config = {
  /**
   * Base URL of the NestJS backend.
   * Used by next.config.mjs rewrites to proxy /api/* requests.
   * Not used by the axios instance (which sends relative requests through
   * the Next.js rewrite layer).
   */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001",

  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV === "development",
} as const;

export default config;
