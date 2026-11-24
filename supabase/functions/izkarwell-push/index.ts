// izkarwell. Web Push pilot: authenticated device registration and test only.
// No health records are read or transferred. Scheduling is a separate step.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import webpush from "npm:web-push@3.6.7";

const origin = "https://dtalh.github.io";
const site = origin + "/izkarwell/";
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const reply = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const b64 = /^[A-Za-z0-9_-]+$/;
function safeSubscription(value: any) {
  if (!value || typeof value.endpoint !== "string" || value.endpoint.length > 4096) return null;
  let url: URL;
  try { url = new URL(value.endpoint); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return null;
  if (!(host.endsWith(".push.apple.com") || host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" || host.endsWith(".notify.windows.com"))) return null;
  if (url.pathname === "/") return null;
  const p = value.keys?.p256dh, a = value.keys?.auth;
  if (typeof p !== "string" || typeof a !== "string" || p.length !== 87 ||
      a.length !== 22 || !b64.test(p) || !b64.test(a)) return null;
  return { endpoint: url.href, keys: { p256dh: p, auth: a } };
}
Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) return reply(403, { error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, { error: "sign_in_required" });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    // Prefer current named API keys; retain legacy fallback for existing projects.
    let modern: string | undefined;
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      if (typeof keys.default === "string" && keys.default.startsWith("sb_secret_")) modern = keys.default;
    } catch { /* Legacy fallback below. */ }
    const service = modern || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const pub = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
    const priv = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
    const checks = {
      supabase_url: !!url,
      server_key: !!service,
      vapid_public_format: !!pub && pub.length === 87 && b64.test(pub),
      vapid_private_format: !!priv && priv.length === 43 && b64.test(priv),
    };
    if (!url || !service || !pub || !priv || !Object.values(checks).every(Boolean)) {
      // Only names, booleans and lengths. Never print keys, JWTs or endpoints.
      console.warn("izkarwell push configuration", JSON.stringify({
        ...checks, public_length: pub?.length ?? 0, private_length: priv?.length ?? 0
      }));
      return reply(503, { error: "server_not_configured" });
    }
    const db = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        // A modern secret belongs on apikey, not on Authorization as a fake JWT.
        if (modern && headers.get("authorization") === "Bearer " + service) headers.delete("authorization");
        return fetch(input, { ...init, headers });
      } }
    });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user || user.is_anonymous) return reply(401, { error: "sign_in_required" });
    const raw = await req.text();
    if (raw.length > 12000) return reply(413, { error: "request_too_large" });
    let body: any;
    try { body = JSON.parse(raw); } catch { return reply(400, { error: "invalid_json" }); }
    if (!body || typeof body !== "object") return reply(400, { error: "invalid_request" });
    if (body.action === "public-key") return reply(200, { publicKey: pub });
    if (typeof body.device_id !== "string" || !uuid.test(body.device_id)) {
      return reply(400, { error: "invalid_device" });
    }
    const device = body.device_id;
    const owned = () => db.from("push_devices").select("*").eq("user_id", user.id).eq("device_id", device);
    if (body.action === "register") {
      const sub = safeSubscription(body.subscription);
      if (!sub) return reply(400, { error: "unsupported_subscription" });
      const { data: current, error: readError } = await owned().maybeSingle();
      if (readError) throw readError;
      if (!current) {
        const { count, error } = await db.from("push_devices").select("device_id", { count: "exact", head: true }).eq("user_id", user.id);
        if (error) throw error;
        if ((count ?? 0) >= 8) return reply(409, { error: "device_limit" });
      }
      // Do not reset last_test_at or scheduled preferences on re-registration.
      const { error } = await db.from("push_devices").upsert({
        user_id: user.id, device_id: device, subscription: sub,
        enabled: true, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,device_id" });
      if (error) throw error;
      return reply(200, { registered: true });
    }
    if (body.action === "disable") {
      const { error } = await db.from("push_devices").update({
        enabled: false, water_enabled: false, next_due_at: null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("device_id", device);
      if (error) throw error;
      return reply(200, { disabled: true });
    }
    if (body.action === "test") {
      // Atomic per-device cooldown; only the authenticated user's enabled device.
      const now = new Date();
      const cutoff = new Date(now.getTime() - 60_000).toISOString();
      const { data: row, error } = await db.from("push_devices")
        .update({ last_test_at: now.toISOString() })
        .eq("user_id", user.id).eq("device_id", device).eq("enabled", true)
        .or("last_test_at.is.null,last_test_at.lt." + cutoff)
        .select("subscription").maybeSingle();
      if (error) throw error;
      if (!row) return reply(429, { error: "not_registered_or_cooldown" });
      const sub = safeSubscription(row.subscription);
      if (!sub) return reply(400, { error: "unsupported_subscription" });
      const message = JSON.stringify({
        title: "izkarwell.", body: "Bildirimler başarıyla bağlandı. İyi yaşam yolculuğun seninle.",
        tag: "izkarwell-test",
      });
      const details = webpush.generateRequestDetails(sub, message, {
        vapidDetails: { subject: site, publicKey: pub, privateKey: priv },
        TTL: 60, urgency: "normal",
      });
      const headers = new Headers(details.headers as Record<string, string>);
      headers.delete("content-length");
      const response = await fetch(details.endpoint, {
        method: "POST", headers, body: details.body ? new Uint8Array(details.body) : undefined,
        redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 404 || response.status === 410) {
        await db.from("push_devices").update({ enabled: false, water_enabled: false, next_due_at: null })
          .eq("user_id", user.id).eq("device_id", device);
        return reply(410, { error: "subscription_expired" });
      }
      if (!response.ok) return reply(502, { error: "push_rejected", provider_status: response.status });
      return reply(200, { accepted: true });
    }
    return reply(400, { error: "unknown_action" });
  } catch {
    // Do not log credentials, subscription endpoints or personal data.
    return reply(500, { error: "push_service_error" });
  }
});
