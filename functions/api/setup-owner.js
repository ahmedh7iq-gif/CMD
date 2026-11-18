
const reply = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.OWNER_SETUP_SECRET) {
    const staging = new URL(request.url).hostname === "cmd-staging.pages.dev";
    const missing = [!env.DB && "DB", !env.OWNER_SETUP_SECRET && "OWNER_SETUP_SECRET"].filter(Boolean);
    return reply({ error: "Configuration missing", ...(staging ? { stage: missing.join(", ") } : {}) }, 503);
  }

  const secret = request.headers.get("X-Setup-Secret");

  if (!secret || secret !== env.OWNER_SETUP_SECRET) {
    return reply({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }

  const password = body?.password;

  if (typeof password !== "string" ||
      password.length < 16 ||
      password.length > 128) {
    return reply({ error: "Invalid password length" }, 400);
  }

  let stage = "check-owner";
  try {
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE role = 'owner' LIMIT 1"
  ).first();
  if (existing) return reply({ error: "Setup unavailable" }, 403);

  stage = "hash-password";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const iterations = 100000;
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    key,
    256
  );

  const hex = bytes =>
    [...new Uint8Array(bytes)]
      .map(x => x.toString(16).padStart(2, "0"))
      .join("");

  const passwordHash =
    `pbkdf2_sha256$${iterations}$${hex(salt)}$${hex(bits)}`;

  stage = "insert-owner";
  const result = await env.DB.prepare(
    `INSERT INTO users
     (full_name, username, password_hash, role)
     SELECT ?, ?, ?, 'owner'
     WHERE NOT EXISTS
       (SELECT 1 FROM users WHERE role = 'owner')`
  ).bind(
    "Ahmed Rasheed",
    "h7iq",
    passwordHash
  ).run();

  if (result.meta.changes !== 1) {
    return reply({ error: "Setup unavailable" }, 403);
  }

  return reply({ success: true }, 201);
  } catch (error) {
    console.error("Owner setup failed at stage:", stage, error);
    return reply({ error: "Owner setup failed", stage }, 500);
  }
}
