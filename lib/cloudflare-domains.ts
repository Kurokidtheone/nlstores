// Cloudflare for SaaS: custom hostnames for client domains (clientstore.com).
// Needs CF_ZONE_ID (var) and CF_API_TOKEN (secret, "SSL and Certificates: Edit" on the zone).

type CfResult = { ok: true; id: string } | { ok: false; error: string };

export async function createCustomHostname(env: CloudflareEnv, hostname: string): Promise<CfResult> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || env.CF_ZONE_ID.startsWith("REPLACE")) {
    return { ok: false, error: "CF_API_TOKEN / CF_ZONE_ID not configured" };
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv" } }),
  });
  const data = (await res.json().catch(() => null)) as { success?: boolean; result?: { id: string }; errors?: { message: string }[] } | null;
  if (!data?.success || !data.result) return { ok: false, error: data?.errors?.[0]?.message ?? `HTTP ${res.status}` };
  return { ok: true, id: data.result.id };
}
