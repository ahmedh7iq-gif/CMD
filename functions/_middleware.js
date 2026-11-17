
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!url.pathname.startsWith("/api/")) {
    return context.next();
  }

  // Deny API access until authentication is configured.
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
