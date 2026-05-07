// Cloudflare Turnstile server-side verification.
//
// In dev (no secret configured) the check is skipped so the form still works
// against a local server. Production deployments MUST set TURNSTILE_SECRET_KEY.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev fallback
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token, remoteip: ip });

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
