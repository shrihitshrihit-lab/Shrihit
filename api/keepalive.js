/**
 * Keep the free-tier Supabase project active.
 * Called by Vercel Cron (and can also be hit by any uptime monitor).
 * ESM export required because package.json has "type": "module".
 */

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end("Method Not Allowed");
    return;
  }

  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");

  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: "Missing Supabase URL or key in Vercel env.",
      }),
    );
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/store_settings?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
      },
    );

    const body = await response.text();
    const ok = response.status === 200 || response.status === 206;

    res.statusCode = ok ? 200 : 502;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        ok,
        supabase_status: response.status,
        at: new Date().toISOString(),
        detail: ok ? "keepalive ok" : body.slice(0, 300),
      }),
    );
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Keep-alive failed",
      }),
    );
  }
}
