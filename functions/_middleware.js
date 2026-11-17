
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!url.pathname.startsWith("/api/")) {
    return context.next();
  }

  // Allow initial owner setup only via POST.
  if (
    url.pathname === "/api/setup-owner" &&
    context.request.method === "POST"
  ) {
    return context.next();
  }

  return Response.json(
    { error: "Authentication required" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
