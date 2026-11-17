
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

export async function onRequestGet({ env, data }) {
  if (!data?.user?.isAdmin) {
    return json({ error: "غير مصرح" }, 401);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, phone, birth_date,
            address, notes, created_at
     FROM customers ORDER BY id DESC`
  ).all();

  return json({ customers: results });
}

export async function onRequestPost({ request, env, data }) {
  if (!data?.user?.isAdmin) {
    return json({ error: "غير مصرح" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "بيانات غير صالحة" }, 400);
  }

  const name = String(body.name ?? "").trim();
  if (!name || name.length > 150) {
    return json({ error: "الاسم مطلوب" }, 400);
  }

  const phone = String(body.phone ?? "").trim();
  const birthDate = body.birth_date || null;
  const address = String(body.address ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const result = await env.DB.prepare(
    `INSERT INTO customers
     (name, phone, birth_date, address, notes)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(name, phone, birthDate, address, notes).run();

  return json({
    success: true,
    id: result.meta.last_row_id
  }, 201);
}
