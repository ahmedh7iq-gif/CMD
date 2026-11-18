// Temporary fail-closed policy: customer may view credentials after PIN,
// but only the authenticated owner can update the stored password.
// This is intentional until a separate customer update approval factor exists.
export function mayUpdateCredential(actor){return actor==="owner"}
