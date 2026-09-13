import { UnauthorizedError } from "../lib/errors";

const SLACK_SIGNATURE_VERSION = "v0";
const MAX_SIGNATURE_AGE_SECONDS = 60 * 5;

export interface SlackSignatureOptions {
  signingSecret?: string;
  skipVerification?: boolean;
}

export async function verifySlackRequest(
  request: Request,
  rawBody: string,
  options: SlackSignatureOptions = {}
): Promise<void> {
  const signingSecret = options.signingSecret?.trim();

  if (!signingSecret) {
    if (!options.skipVerification) {
      console.warn(
        "[slack] SLACK_SIGNING_SECRET is not configured — skipping signature verification"
      );
    }
    return;
  }

  const timestamp = request.headers.get("X-Slack-Request-Timestamp");
  const signature = request.headers.get("X-Slack-Signature");

  if (!timestamp || !signature) {
    throw new UnauthorizedError("Missing Slack signature headers");
  }

  const ageSeconds = Math.abs(
    Date.now() / 1000 - Number.parseInt(timestamp, 10)
  );
  if (!Number.isFinite(ageSeconds) || ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
    throw new UnauthorizedError("Stale Slack request timestamp");
  }

  const expected = await computeSlackSignature(
    signingSecret,
    timestamp,
    rawBody
  );
  if (!timingSafeEqual(signature, expected)) {
    throw new UnauthorizedError("Invalid Slack request signature");
  }
}

export async function computeSlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string
): Promise<string> {
  const base = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(base)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${SLACK_SIGNATURE_VERSION}=${hex}`;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}
