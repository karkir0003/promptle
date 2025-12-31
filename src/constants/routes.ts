/**
 * Route configuration for authentication and navigation
 */

/** Routes only accessible to unauthenticated users (guests) */
export const AUTH_ROUTES = ["/login", "/auth", "/forgot-password"] as const;

/** Routes only accessible to authenticated users */
export const PROTECTED_ROUTES = [
  "/daily-challenge",
  "/update-password",
] as const;

/** Default redirect destination for authenticated users */
export const DEFAULT_AUTH_REDIRECT = "/daily-challenge";

/** Default redirect destination for unauthenticated users */
export const DEFAULT_UNAUTH_REDIRECT = "/login";

/** Update Password Route during Password Reset */
export const UPDATE_PASSWORD = "/update-password";
