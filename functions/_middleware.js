
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Allow public website pages.
  if (!path.startsWith("/api/")) {
    return context.next();
  }

  // Allow the initial owner setup endpoint.
  // The endpoint checks the secret and existing owner.
  if (
    path === "/api/setup-owner" &&
    context.request.method === "POST"
  ) {
    return context.next();
  }

  // Block all other API requests until
  // authentication is implemented.
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
