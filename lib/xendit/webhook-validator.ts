// Xendit Webhook Validation
// Documentation: https://docs.xendit.co/docs/handling-webhooks
//
// IMPORTANT: Xendit uses SIMPLE TOKEN COMPARISON, not cryptographic signatures
// The x-callback-token header must match exactly with the verification token
// from Xendit Dashboard → Settings → Developers → Webhooks

const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

if (!XENDIT_WEBHOOK_TOKEN) {
  console.warn(
    "XENDIT_WEBHOOK_TOKEN not set - webhook validation will be skipped in development",
  );
}

/**
 * Verify Xendit callback token
 *
 * Xendit sends a verification token in the x-callback-token header with every webhook.
 * This token is unique per Xendit account and environment (test/live).
 *
 * To validate:
 * 1. Get the token from Xendit Dashboard → Settings → Developers → Webhooks
 * 2. Store it in XENDIT_WEBHOOK_TOKEN environment variable
 * 3. Compare the incoming x-callback-token header with this token (exact match)
 *
 * @param token - The x-callback-token header value from the webhook request
 * @returns true if the token matches the configured verification token
 */
export function verifyCallbackToken(token: string | null): boolean {
  // Skip validation in development if token not configured
  if (!XENDIT_WEBHOOK_TOKEN) {
    console.warn(
      "Skipping token verification - XENDIT_WEBHOOK_TOKEN not configured",
    );
    return true;
  }

  if (!token) {
    console.error("Missing x-callback-token header");
    return false;
  }

  // Simple string comparison - Xendit does NOT use cryptographic signatures
  const isValid = token === XENDIT_WEBHOOK_TOKEN;

  if (!isValid) {
    console.error("Invalid callback token - does not match XENDIT_WEBHOOK_TOKEN");
  }

  return isValid;
}
