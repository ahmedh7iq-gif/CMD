# CMD secure delivery — security review (development branch only)

Review date: 2026-11-18. This is a source-code review, **not** a completed penetration test or production certification.

## Changes made
- Added tests/delivery-security.test.mjs covering 6-digit PIN format, keyed PIN hashes, AES-GCM roundtrip/random IV/account binding/tamper detection, invalid encryption keys, read/update ticket scopes, ticket tampering, PIN-reset invalidation, and token digest format.
- Expanded GitHub Actions workflow to run both security and lockout regression tests with Node 22.
- Delivery page removes the QR token from the visible address bar and browser history entry after reading it.
- Signed ticket validation now rejects invalid account IDs.
- Existing lockout tests cover 5 wrong attempts followed by 1h, 2h, 4h, 8h, 16h and permanent lock.
- QR remains stable after password and PIN changes. Owner retrieval requires session and password re-verification.

## Findings and release blockers
1. **No verified CI run yet.** GitHub workflow runs/statuses returned no results for the latest commit when checked. Do not claim automated tests have passed.
2. **No staging Cloudflare/D1 integration test.** Before deployment, run migrations 002–005 on a fresh disposable test database, configure CMD_CREDENTIAL_KEY and OWNER_SETUP_SECRET as secrets, and exercise issue, reprint, PIN lockout, unlock, password update, and receipt scan.
3. **PIN update is not independent MFA.** Re-entering the same PIN is step-up confirmation but not a separate authentication factor. A stolen QR plus PIN permits credential viewing and updates. Decide whether to require owner approval or an independent factor for customer password changes.
4. **Persistent QR is a bearer locator.** Never log/share token-bearing URLs beyond intended recipients. An owner-only emergency revocation mechanism would necessarily invalidate the old QR; do not rotate it on routine password changes.
5. **Owner credential reveal and PIN outputs may remain in browser UI.** Add short-lived masking and clearing, and avoid storing these values in logs.
6. **Audit/rate limiting.** Current PIN attempts are per account; additional IP/device-level abuse throttling and audit monitoring are recommended. Per-account lockout can be abused to deny service.
7. **Legacy migrations.** Older account deliveries created without encrypted_token cannot be reconstructed. Do not fabricate replacement links or silently invalidate receipts.
8. **Receipt quality.** Test QR scanning on actual iOS/Android cameras, print contrast and sizing, and PNG save/share behavior. Source inspection is not device testing.
9. **Cloudflare Pages security headers.** Add appropriate Content-Security-Policy, no-store and no-referrer controls and verify compatibility with the current inline scripts before enforcement.

## Non-destructive policy
No migration, secret change, branch merge, production deployment, or edit/delete of real sales was performed by this review. PR #3 remains a draft until release blockers are resolved.
