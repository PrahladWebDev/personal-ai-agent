/**
 * Lightweight prompt-injection / data-exfiltration guardrail.
 *
 * This is defense-in-depth, not the only line of defense: the system
 * prompt also instructs the model to refuse these requests, and the
 * retrieval layer never includes private-visibility chunks in the first
 * place. This catches the common, blunt attempts before they even reach
 * the model, and flags suspicious turns for logging/rate-limit purposes.
 */

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore (all|any|previous|prior|the) instructions/i,
  /system prompt/i,
  /show (me )?(the )?(database|db|credentials|api key|env|environment variables)/i,
  /reveal (your|the) (prompt|instructions|rules)/i,
  /you are now/i,
  /disregard (all|any|previous|prior) (rules|instructions)/i,
  /act as (if you (are|were)|an unrestricted)/i,
  /list all (hidden|private|internal) (documents|data|information)/i,
  /give me the (api key|password|secret|token)/i,
  /jailbreak/i,
  /\bDAN\b/,
];

export function isSuspiciousInput(input: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

/** Strips characters commonly used to break out of a prompt's structure. */
export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/```/g, "'''")
    .slice(0, 2000);
}
