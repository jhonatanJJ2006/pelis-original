# Android TV Auth (Webos)

Contract for native Android TV clients talking to Better Auth on production.

**Base URL:** `https://verpelis.pro`

## Recommendation

- **Preferred for TV:** QR / phone pairing via `/api/tv-auth/*` (no password typing on the remote).
- **Also supported:** direct email/password against Better Auth (`/api/auth/sign-in/email`, `/api/auth/sign-up/email`).
- **Google OAuth:** browser redirect flow only — **not** usable from a native Android TV HTTP client.

## Email / password

### Login

- **Method / path:** `POST /api/auth/sign-in/email`
- **Full URL:** `https://verpelis.pro/api/auth/sign-in/email`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

- **Success (200):** JSON includes `user`, session `token`, and `redirect`. Also sets cookie `__Secure-better-auth.session_token` (prod HTTPS).
- **Errors:** e.g. `401` `{ "code": "INVALID_EMAIL_OR_PASSWORD", "message": "..." }`; unverified email → forbidden / verify message.

### Register

- **Method / path:** `POST /api/auth/sign-up/email`
- **Full URL:** `https://verpelis.pro/api/auth/sign-up/email`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "name": "Display Name",
  "email": "user@example.com",
  "password": "secret-min-8-chars"
}
```

- **Success (200):** `{ "user": { ... }, "token": null }` when email verification is required (current prod). No session until the user verifies and then logs in.
- **Errors:** e.g. password too short, user already exists (`message` / `code` in JSON).

### Email verification (OTP)

Custom routes (not Better Auth core):

| Action | Method / path | Body |
|--------|---------------|------|
| Send OTP | `POST /api/auth/email-otp/send-verification-otp` | `{ "email": "...", "type": "email-verification" }` (type optional for server; email required) |
| Verify OTP | `POST /api/auth/email-otp/verify-email` | `{ "email": "...", "otp": "123456" }` |

After verify → call **login** again to get a session cookie/token.

### Session

- **Get session:** `GET /api/auth/get-session`
- Send the session cookie on subsequent API calls.
- **Cookie (prod):** `__Secure-better-auth.session_token` (HttpOnly, `SameSite=Lax`, `Secure`, `Path=/`).
- Sign-in JSON also returns a raw `token`; native clients should prefer persisting **Set-Cookie** (cookie jar) for `get-session` / app APIs.
- **CSRF / Origin:** Better Auth origin check applies when the request already carries cookies. First login/register without a Cookie header does not require `Origin`. Do not send a bogus Origin from the TV app.
- **Bearer:** optional `Authorization: Bearer <token>` is **not** required for the documented cookie flow; bearer plugin is not the primary TV contract.

## TV pairing / QR (preferred UX)

| Step | Method / path | Body / query |
|------|---------------|--------------|
| Create pairing | `POST /api/tv-auth/pairing` | `{ "deviceId": "<stable-id>" }` → `code`, `displayCode`, `deviceId`, `expiresAt`, `verifyUrl` |
| Poll status | `GET /api/tv-auth/pairing?code=...&deviceId=...` | → `status`: `pending` \| `approved` \| `claimed` \| `expired` |
| Claim session | `POST /api/tv-auth/claim` | `{ "code": "...", "deviceId": "..." }` → `{ ok, status, token, cookieName }` + Set-Cookie |
| QR image | `GET /api/tv-auth/qr?data=<verifyUrl>` | SVG |
| Approve (phone, logged-in) | `POST /api/tv-auth/approve` | `{ "code": "..." }` (requires existing web session) |

Phone opens `verifyUrl` / `/link-tv?code=...` on `https://verpelis.pro`.

## Quick endpoints table

| Action | URL |
|--------|-----|
| Base | `https://verpelis.pro` |
| Login | `POST https://verpelis.pro/api/auth/sign-in/email` |
| Register | `POST https://verpelis.pro/api/auth/sign-up/email` |
| Send OTP | `POST https://verpelis.pro/api/auth/email-otp/send-verification-otp` |
| Verify OTP | `POST https://verpelis.pro/api/auth/email-otp/verify-email` |
| Session | `GET https://verpelis.pro/api/auth/get-session` |
| Pairing create | `POST https://verpelis.pro/api/tv-auth/pairing` |
| Pairing status | `GET https://verpelis.pro/api/tv-auth/pairing` |
| Claim | `POST https://verpelis.pro/api/tv-auth/claim` |
| Approve | `POST https://verpelis.pro/api/tv-auth/approve` |
| QR | `GET https://verpelis.pro/api/tv-auth/qr` |

## Google OAuth

Configured for web (`/api/auth/callback/google`). **Do not** use from native TV; use email/password or QR pairing instead.
