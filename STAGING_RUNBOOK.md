# Isolated Cloudflare Pages + D1 staging runbook

**Status:** Not executed. This document is a manual runbook, not evidence of a staging test. Do not use the production D1 database or its secrets.

## Preconditions
- Use a **separate Cloudflare Pages project** for staging (for example `cmd-delivery-staging`) and a **new empty D1 database** (for example `cmd-delivery-staging-db`). Never attach production `DB` to staging.
- Connect only branch `feature/secure-delivery-foundation`. Do not merge PR #3.
- In staging Pages settings, bind the new D1 database as **`DB`**. Verify the database ID is different from production before any SQL.
- Add independent **encrypted** staging secrets `OWNER_SETUP_SECRET` and `CMD_CREDENTIAL_KEY` (64 hex characters / 32 bytes). Do not reuse production secrets or put their values in GitHub, chat, or screenshots.
- Never copy actual customer passwords, PINs, QR tokens or personal records into staging.

## Initialize the disposable staging database
The migrations assume the existing CMD owner/user schema. First create the existing user schema on staging using the project's normal setup instructions, and create a **test-only owner** with a test-only password. Do not import real user records.

From the project checkout, after verifying the staging database name and credentials, run each migration **against the staging database only**:

```sh
npx wrangler d1 execute cmd-delivery-staging-db --remote --file=migrations/001_sold_accounts.sql
npx wrangler d1 execute cmd-delivery-staging-db --remote --file=migrations/002_secure_delivery.sql
npx wrangler d1 execute cmd-delivery-staging-db --remote --file=migrations/003_delivery_credentials.sql
npx wrangler d1 execute cmd-delivery-staging-db --remote --file=migrations/004_encrypted_profile.sql
npx wrangler d1 execute cmd-delivery-staging-db --remote --file=migrations/005_permanent_qr.sql
```

**Do not execute these commands until the database name is confirmed to be staging.** Do not apply migration 001 to a database where the sold_accounts table already contains data.

## Staging acceptance tests
1. Create a fake Apple/Google sale and issue exactly one QR + PIN.
2. Scan the QR in an iPhone and Android browser; PIN must be delivered separately.
3. Reissue the *same* sale: should return HTTP 409, not a new QR.
4. Owner reprints the receipt after re-entering password: link must be byte-for-byte identical.
5. Five incorrect PINs should lock for one hour. Simulate later lock transitions using test-only rows/time controls, never production.
6. Verify customer can view encrypted password/profile with correct PIN, but customer update receives HTTP 403 even if calling the API directly.
7. Owner changes stored password after re-authentication; original QR must still open and show the new stored value.
8. Owner resets PIN; old PIN and old signed tickets must fail, while original QR remains unchanged.
9. Test permanent lock and owner recovery on the fake account.
10. Inspect browser developer tools and Cloudflare logs for secret leaks, caching and referrer headers.
11. Verify receipts: only buyer name, account email, QR and price; save/share PNG and print on iPhone.
12. Delete the **disposable staging database** after test sign-off only if no longer needed. Never delete production resources.

## Release gate
Require passing GitHub Actions, verified staging Pages URL, staging D1 migration evidence, manual end-to-end checks, owner approval, and a separate production D1 backup. Production deployment is **not** authorized by this document.
