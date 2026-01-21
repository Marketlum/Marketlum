## Claude Code Spec — User Management Module (Auth + Profile + Avatar + Locale + Agreement + Agent)

### Goal

Implement a **User Management** module with:

* User CRUD (admin-facing)
* Authentication (login/logout)
* Password hashing + forgotten password flow
* User profile fields (avatar, active/inactive, dates)
* User references:

  * `agentId` (required)
  * `relationshipAgreementId` (optional; single Agreement)
  * `defaultLocaleId` (required)

Users must be able to:

* log in using email + password
* request password reset (forgotten password)
* upload/select avatar (from Files library)

---

# 1) Data Model

## 1.1 Entity: `User`

Fields:

* `id: UUID`
* `email: string` *(required, unique, case-insensitive)*
* `passwordHash: string` *(required)*
* `isActive: boolean` *(required, default true)*
* `avatarFileId: UUID | null` *(optional; references FileAsset)*
* `agentId: UUID` *(required; references Agent)*
* `relationshipAgreementId: UUID | null` *(optional; references Agreement)*
* `birthday: date | null` *(optional)*
* `joinedAt: date | null` *(optional)*
* `leftAt: date | null` *(optional)*
* `defaultLocaleId: UUID` *(required; references Locale)*
* `createdAt: datetime`
* `updatedAt: datetime`
* `lastLoginAt: datetime | null` *(optional but recommended)*

Constraints:

* `email` must be unique (case-insensitive)
* `agentId` must be unique (recommended: 1 User ↔ 1 Agent)
* `leftAt >= joinedAt` if both set
* If `isActive = false`, user cannot log in

---

## 1.2 Entity: `PasswordResetToken`

Fields:

* `id: UUID`
* `userId: UUID`
* `tokenHash: string` *(store hash, never raw token)*
* `expiresAt: datetime`
* `usedAt: datetime | null`
* `createdAt: datetime`

Rules:

* token valid if `usedAt == null` and `now < expiresAt`
* expire tokens after e.g. **60 minutes**
* allow multiple requests but invalidate previous tokens (recommended)

---

# 2) Authentication & Security

## Password Handling

* Store only `passwordHash` (bcrypt or argon2)
* Password rules (MVP):

  * min length 8
  * max length 128
* On login:

  * compare password to hash
  * reject if inactive

## Session Strategy

Choose one:

* **JWT** (access token + refresh token)
* **Cookie-based session** (server sessions)

**Recommended MVP:** JWT + httpOnly cookie for refresh token.

---

# 3) Backend API

## 3.1 Auth Endpoints

### Register (optional)

If admin-only creation, skip public register.
For MVP: implement admin create user (see below).

### Login

`POST /auth/login`
Body:

```json
{ "email": "user@example.com", "password": "secret" }
```

Response:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "isActive": true,
    "agentId": "...",
    "defaultLocaleId": "...",
    "avatarFileId": null
  },
  "accessToken": "..."
}
```

Errors:

* `401` invalid credentials
* `403` user inactive

### Logout

`POST /auth/logout`

* invalidates refresh token/session

### Get Current User

`GET /auth/me`
Returns current user profile.

---

## 3.2 Forgotten Password Flow

### Request Reset

`POST /auth/forgot-password`
Body:

```json
{ "email": "user@example.com" }
```

Response:

```json
{ "ok": true }
```

Security requirement:

* Always return `{ ok: true }` even if email not found (prevent enumeration)

Behavior:

* generate random token (e.g. 32 bytes)
* store `tokenHash` + expiry
* send email with reset link:

  * `https://<app>/reset-password?token=...`

### Reset Password

`POST /auth/reset-password`
Body:

```json
{ "token": "raw-token-from-email", "newPassword": "newSecret123" }
```

Behavior:

* find tokenHash match
* validate expiry + unused
* update user passwordHash
* set token usedAt
* invalidate existing sessions/refresh tokens (recommended)

Response:

```json
{ "ok": true }
```

---

## 3.3 Users CRUD (Admin)

### List Users (paginated)

`GET /users`
Query params:

* `q` (search email)
* `isActive`
* `agentId`
* `localeId`
* `page`, `pageSize`
* `sort` (createdAt_desc default)

Returns:

```json
{
  "data": [
    {
      "id": "...",
      "email": "...",
      "isActive": true,
      "avatarFileId": "...",
      "agentId": "...",
      "relationshipAgreementId": null,
      "birthday": "1990-01-01",
      "joinedAt": "2024-01-01",
      "leftAt": null,
      "defaultLocaleId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 10
}
```

### Create User

`POST /users`
Body:

```json
{
  "email": "user@example.com",
  "password": "TempPassword123!",
  "isActive": true,
  "agentId": "uuid-agent",
  "defaultLocaleId": "uuid-locale",
  "relationshipAgreementId": "uuid-agreement-or-null",
  "avatarFileId": "uuid-file-or-null",
  "birthday": "1990-01-01",
  "joinedAt": "2025-01-01",
  "leftAt": null
}
```

Rules:

* email unique
* agent must exist
* locale must exist
* agreement must exist if provided
* avatar file must exist if provided

### Update User

`PATCH /users/:id`
Body can include:

* `email` (optional; still unique)
* `isActive`
* `avatarFileId`
* `agentId` (optional; recommended to disallow if already set)
* `relationshipAgreementId`
* `birthday`, `joinedAt`, `leftAt`
* `defaultLocaleId`

### Set Password (Admin)

`POST /users/:id/set-password`
Body:

```json
{ "newPassword": "NewPassword123!" }
```

### Delete User (optional)

MVP recommendation: **do not hard delete**. Instead:

* set `isActive=false`
* set `leftAt=today` (optional)

If implementing delete:

* `DELETE /users/:id`
* block if referenced by audit logs, etc.

---

## 3.4 Avatar Integration (Files Library)

### Option A (recommended): reuse existing file upload endpoints

* Upload avatar via `/files/upload`
* Select existing file from media library
* Set user avatar by updating:

  * `PATCH /users/:id` with `avatarFileId`

Validation:

* avatar must be an image mimeType (`image/*`)
* optional max size constraint (e.g. 5MB)

---

# 4) Frontend Requirements (React)

## 4.1 Login Page `/login`

Fields:

* email
* password
  Actions:
* Login
* “Forgot password?”

Behavior:

* on success redirect to app home
* show error on invalid credentials
* show “inactive” message if blocked

## 4.2 Forgot Password Page `/forgot-password`

Fields:

* email
  Action:
* Send reset link
  Show generic success message always.

## 4.3 Reset Password Page `/reset-password?token=...`

Fields:

* new password
* confirm password
  Action:
* Reset password
  Show success + link to login.

---

## 4.4 Users Admin Page `/users`

Paginated list with columns:

* Avatar
* Email
* Active/Inactive badge
* Agent (name)
* Default Locale
* JoinedAt / LeftAt
* Actions: Edit, Deactivate/Activate, Set Password

Filters:

* Search by email
* Active status
* Locale

---

## 4.5 User Edit Page `/users/:id` (or inline panel)

Editable fields:

* Email
* Active toggle
* Agent selector (required)
* Default Locale selector (required)
* Relationship Agreement selector (optional)
* Birthday (date)
* JoinedAt (date)
* LeftAt (date)
* Avatar:

  * “Upload” (opens file upload)
  * “Choose from Library” (opens media picker)
  * Preview avatar

UX rules:

* If `leftAt` set, suggest `isActive=false` (warning)
* If deactivating, optionally set `leftAt=today`

---

# 5) Email Delivery (Forgot Password)

MVP requirement:

* implement email sending abstraction `EmailService`
* for dev: log reset link to console
* for prod: integrate with provider (e.g. SES, Mailgun, Postmark)

Reset email content:

* Subject: “Reset your password”
* Body includes reset link + expiry notice

---

# 6) Seed Data (Optional)

Seed endpoint:
`POST /users/seed`

Seed Locales required:

* `en-US`
* `pl-PL`

Seed Agents required:

* `Marketlum` (org)
* `Paweł` (individual)

Seed Agreements optional:

* “Employment Agreement — Paweł” (InternalMarket)

Seed Users:

* `admin@marketlum.com` (active, locale en-US, agent Marketlum)
* `pawel@marketlum.com` (active, locale pl-PL, relationshipAgreement set)

Idempotent seeding.

---

# 7) Validation & Error Handling

Common errors:

* Duplicate email → `409 Conflict` `"Email already exists."`
* Missing agent/locale → `400 Bad Request`
* Avatar not an image → `400 Bad Request` `"Avatar must be an image."`
* Reset token invalid/expired → `400 Bad Request` `"Reset token is invalid or expired."`

---

# 8) Testing Requirements

## Backend

* create user hashes password
* login success + failure cases
* inactive user cannot login
* forgot password creates token and expires correctly
* reset password updates hash and invalidates token
* user update sets avatarFileId and validates mimeType
* list users pagination works

## Frontend

* login flow
* forgot/reset password flow
* user list renders and paginates
* user edit updates fields

---

# 9) Acceptance Criteria

* Users can log in with email/password.
* Users can request and complete password reset.
* Users have avatar support (upload or choose from library).
* Users can be activated/deactivated; inactive users cannot log in.
* Each user references exactly one Agent.
* Each user has a default Locale.
* User may reference one relationshipAgreement (Agreement).
* Users list is paginated and editable via admin UI.
