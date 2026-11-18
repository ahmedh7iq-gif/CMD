# CMD secure delivery — deployment checklist

This branch is a **draft**. Do not merge to production before completing the checklist and testing.

1. Back up the production D1 database.
2. Execute `migrations/002_secure_delivery.sql` then `migrations/003_delivery_credentials.sql` against the same production D1 binding named `DB`. Neither migration modifies existing sold-account records.
3. Generate a random 32-byte encryption key and store its **64-character hex** representation in the Cloudflare Pages **encrypted secret** named `CMD_CREDENTIAL_KEY`. Never commit the key, paste it into a chat, or reuse the owner login password.
4. Ensure `OWNER_SETUP_SECRET` remains configured as an encrypted secret. Deploy a staging branch first, verify owner session, new delivery, PIN throttling, 1h/2h/4h/8h/permanent lock transitions, owner recovery, encrypted password read/update, and account isolation.
5. Ensure Cloudflare Access / WAF rate limiting protects the unauthenticated verification endpoint against high-volume abuse; app-level per-account throttling alone does not prevent denial-of-service or resource exhaustion.
6. Confirm that passwords are updated first at Apple/Google; CMD only stores an encrypted copy and does not call Apple/Google password APIs.
7. Receipt QR rendering is **not yet implemented**. The owner issuance page currently provides an opaque delivery URL and PIN, which must be delivered separately. Do not put PIN or credentials in a QR.
8. Harden the production deployment with restrictive CSP, privacy review of DOB/address, additional customer step-up authentication for sensitive changes, and integration tests. Never place secrets in logs.
9. The QR URL token is only returned once at issuance. Do not lose it. Reissue/revoke workflows are pending.

Known limitations: owner credential view and password update are audited, but PIN attempts are not yet individually audited; owner credential view is gated by re-entering the owner's password. The 10-minute customer ticket is memory-only and invalidated by PIN reset. This is not production-ready until testing and review.
