# TDARAB API Documentation

**Base URL:** `https://api.tadarrabmed.com`
**Version:** 1.3.0
**Last Updated:** May 7, 2026  
**Format:** All responses follow `{ data, message, error }`

---

## Test Credentials

All seed accounts share the same password: `123456`

**Key test accounts:**

| Email | Name | Plan | Level | Use Case |
|-------|------|------|-------|----------|
| student.free@example.com | سامر العلي | مجاني | 1 | Free tier - test locked content and upgrade flow |
| student.basic@example.com | لينا حداد | basic | 2 | Active basic subscriber (expires in 30 days) |
| student.pro@example.com | يوسف الخوري | pro | 3 | Active pro subscriber (expires in 60 days) |
| student.premium@example.com | رنا منصور | premium | 4 | Full access - longest expiry (365 days) |
| student.expired@example.com | كرم سليمان | مجاني | 1 | Was paid - subscription expired 10 days ago |
| student.new@example.com | مايا حلاق | مجاني | 1 | Just registered - zero attempts |

> 12 total seed users exist - see `backend/prisma/seeds/users.js` for the full list.

**Test Activation Codes:**

| Code | Plan Level | Duration | Status | Use Case |
|------|-----------|----------|--------|----------|
| TEST-BASIC-7D-01 | 2 (basic) | 7 days | ✅ Valid | Quick upgrade test |
| TEST-BASIC-30D-01 | 2 (basic) | 30 days | ✅ Valid | Standard basic upgrade |
| TEST-BASIC-30D-02 | 2 (basic) | 30 days | ✅ Valid | Second valid code - test concurrent activation |
| TEST-PRO-30D-01 | 3 (pro) | 30 days | ✅ Valid | Upgrade to pro |
| TEST-PREM-365D-01 | 4 (premium) | 365 days | ✅ Valid | Upgrade to premium |
| TEST-BASIC-NEAREXP | 2 (basic) | 30 days | ✅ Valid (expires in 3 days) | Test near-expiry warning UI |
| TEST-BASIC-USED-01 | 2 (basic) | 30 days | ❌ Used | Test "Code already used" error |
| TEST-PRO-USED-01 | 3 (pro) | 60 days | ❌ Used | Test "Code already used" error |
| TEST-BASIC-EXPIRED | 2 (basic) | 30 days | ❌ Expired | Test "Code has expired" error |
| TEST-PRO-EXPIRED | 3 (pro) | 30 days | ❌ Expired | Test "Code has expired" error |

> ⚠️ **Dev only:** These credentials are for development and testing only. Never use them in production.

---

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Access tokens expire after **15 minutes**. Use the refresh endpoint to get a new one.

---

## Response Format

Every response follows this structure:

```json
{
  "data": { ... },
  "message": "Human-readable message or null",
  "error": "Error description or null"
}
```

---

## Request Requirements (all POST endpoints)

- **Header:** `Content-Type: application/json`
- **Body size limit:** `10 kb`. Any request body larger than this is rejected with `413`.
- **Body must be valid JSON.** A malformed JSON body is rejected with `400` before the route handler runs.

### Common Errors (apply to every POST endpoint)

| Status | Error | When |
|--------|-------|------|
| 400 | `Invalid JSON in request body` | The request body is not valid JSON (parse failed) |
| 413 | `Request body too large` | The request body exceeds 10 kb |
| 500 | `Internal server error` | Unexpected server-side failure |

These are global fallbacks. Endpoint-specific errors are listed under each endpoint below.

---

## Endpoints

### Auth

#### POST /api/auth/register

Create a new user account. New users are assigned the free plan (level 1).

**Auth:** None  
**Rate Limit:** 3 requests per hour per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | User email (unique) |
| name | string | ✅ | User display name |
| password | string | ✅ | User password |

**Success Response (201):**

```json
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-04-13T12:00:00.000Z",
    "plan": { "id": 1, "name": "مجاني", "level": 1 }
  },
  "message": "Registration successful",
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `email, name, and password are required` | Missing fields |
| 409 | `Email already in use` | Duplicate email |
| 429 | `Too many registration attempts, please try again later` | Rate limit exceeded |

---

#### POST /api/auth/login

Authenticate a user and receive access + refresh tokens.

**Auth:** None  
**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | User email |
| password | string | ✅ | User password |

**Success Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "plan": { "id": 1, "name": "مجاني", "level": 1 },
      "planExpiresAt": null
    }
  },
  "message": "Login successful",
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `email and password are required` | Missing fields |
| 401 | `Invalid credentials` | Wrong email or password |
| 429 | `Too many login attempts, please try again later` | Rate limit exceeded |

---

#### POST /api/auth/refresh

Get a new access token using a valid refresh token.

**Auth:** None
**Rate Limit:** 10 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | ✅ | The refresh token from login |

**Success Response (200):**

```json
{
  "data": { "accessToken": "eyJhbGciOi..." },
  "message": "Token refreshed",
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `refreshToken is required` | Missing field |
| 401 | `Invalid refresh token` | Token not found in DB (already logged out or forged) |
| 401 | `Refresh token expired` | Token row exists in DB but its `expiresAt` is in the past. The row is deleted server-side; the client **must force a full re-login** and not retry `/refresh`. |
| 401 | `Invalid or expired refresh token` | JWT signature invalid or malformed payload |
| 429 | `Too many token refresh attempts, please try again later` | Rate limit exceeded (10 req/15 min) |

---

#### POST /api/auth/logout

Invalidate a refresh token (remove from DB). Requires authentication - only the token owner can log out.

**Auth:** 🔒 Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | ✅ | The refresh token to invalidate |

**Success Response (200):**

```json
{
  "data": null,
  "message": "Logged out successfully",
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `refreshToken is required` | Missing field |
| 401 | `Unauthorized` | No or invalid access token |
| 403 | `Token does not belong to this user` | Token belongs to a different user |

---

### Content

#### GET /api/sections

Get all sections with their subsections. Locked items return minimal data. Each unlocked subsection includes `totalChapters` - for per-chapter stats, use `GET /api/sections/:id/subsections`.

**Auth:** 🔒 Required

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "السنة الأولى",
      "order": 1,
      "requiredPlanLevel": 1,
      "locked": false,
      "subSections": [
        {
          "id": 1,
          "name": "التشريح",
          "order": 1,
          "requiredPlanLevel": 1,
          "locked": false,
          "totalChapters": 3
        },
        {
          "id": 2,
          "locked": true,
          "requiredPlanLevel": 2
        }
      ]
    },
    {
      "id": 2,
      "locked": true,
      "requiredPlanLevel": 2
    }
  ],
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |

---

#### GET /api/sections/:id/subsections

Get subsections for a specific section with chapters and progress stats.

**Auth:** 🔒 Required

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | integer | Section ID |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "التشريح",
      "order": 1,
      "sectionId": 1,
      "requiredPlanLevel": 1,
      "locked": false,
      "totalChapters": 3,
      "chapters": [
        {
          "id": 1,
          "name": "تشريح الطرف العلوي",
          "order": 1,
          "subSectionId": 1,
          "requiredPlanLevel": 1,
          "locked": false,
          "totalQuestions": 15,
          "userStats": { "answered": 10, "correct": 8 }
        },
        {
          "id": 2,
          "locked": true,
          "requiredPlanLevel": 2
        }
      ]
    }
  ],
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |
| 403 | `Access denied` | User plan level too low |
| 404 | `Section not found` | Invalid section ID |

---

#### GET /api/chapters/subsection/:id

Get chapters for a specific subsection with progress stats.

**Auth:** 🔒 Required

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | integer | SubSection ID |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "تشريح الطرف العلوي",
      "order": 1,
      "subSectionId": 1,
      "requiredPlanLevel": 1,
      "locked": false,
      "totalQuestions": 15,
      "userStats": { "answered": 10, "correct": 8 }
    },
    {
      "id": 2,
      "locked": true,
      "requiredPlanLevel": 2
    }
  ],
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |
| 403 | `Access denied` | User plan level too low |
| 404 | `SubSection not found` | Invalid subsection ID |

---

#### GET /api/chapters/:id/questions

Get questions for a specific chapter. Locked questions return minimal data. `isCorrect` is **never** included in choices. Each question returns between 2 and 5 choices (empty choices are filtered server-side).

**Auth:** 🔒 Required

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | integer | Chapter ID |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "text": "كم عدد عظام الطرف العلوي؟",
      "imageUrl": null,
      "requiredPlanLevel": 1,
      "choices": [
        { "id": 1, "text": "32" },
        { "id": 2, "text": "206" },
        { "id": 3, "text": "64" },
        { "id": 4, "text": "126" }
      ],
      "_note": "choices count is 2-5 depending on the question"
    },
    {
      "id": 3,
      "locked": true,
      "requiredPlanLevel": 2
    }
  ],
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |
| 403 | `Access denied` | User plan level too low for chapter |
| 404 | `Chapter not found` | Invalid chapter ID |

---

### Attempts

#### POST /api/attempts

Submit an answer to a question. Returns whether correct, the explanation, and the correct choice.

**Auth:** 🔒 Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| questionId | integer | ✅ | The question ID |
| selectedChoiceId | integer | ✅ | The chosen answer ID |

**Success Response (201):**

```json
{
  "data": {
    "attemptId": 1,
    "isCorrect": true,
    "explanation": "يحتوي جسم الإنسان البالغ على 206 عظمة.",
    "correctChoice": { "id": 1, "text": "206" }
  },
  "message": "Correct!",
  "error": null
}
```

> When the answer is wrong, `isCorrect` is `false` and `message` is `"Wrong answer"`. The `correctChoice` and `explanation` are always returned regardless.

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `questionId and selectedChoiceId are required` | Missing fields |
| 400 | `Invalid choice for this question` | Choice doesn't belong to question |
| 401 | `Unauthorized` | No or invalid token |
| 403 | `Access denied` | User plan level too low - response also includes `locked: true` and `requiredPlanLevel` |
| 404 | `Question not found` | Invalid question ID |

---

### User

#### GET /api/me

Get the current authenticated user's profile.

**Auth:** 🔒 Required

**Success Response (200):**

```json
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "planExpiresAt": "2026-05-13T00:00:00.000Z",
    "plan": { "id": 2, "name": "خطة أولى", "level": 2 }
  },
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |

---

#### GET /api/plans

Get all active plans with full content tree per plan level. No authentication required.

Each plan includes all content accessible at that level (`requiredPlanLevel <= plan.level`): sections, subsections, chapters, and question counts. Use this endpoint to build a pricing/features page on the frontend.

**Auth:** None

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "مجاني",
      "level": 1,
      "price": 0,
      "currency": "USD",
      "content": {
        "sectionsCount": 3,
        "subSectionsCount": 8,
        "chaptersCount": 24,
        "questionsCount": 180,
        "sections": [
          {
            "id": 1,
            "name": "السنة الأولى",
            "description": null,
            "subSectionsCount": 2,
            "subSections": [
              {
                "id": 1,
                "name": "التشريح",
                "description": null,
                "chaptersCount": 3,
                "chapters": [
                  { "id": 1, "name": "الجهاز الهيكلي", "description": null, "questionsCount": 32 }
                ]
              }
            ]
          }
        ]
      }
    }
  ],
  "message": null,
  "error": null
}
```

**Last Updated:** May 7, 2026 - Added `content` tree to each plan.

---

### Activation

#### POST /api/activate

Activate a subscription code. Upgrades the user's plan and creates a subscription record.

**Auth:** 🔒 Required  
**Rate Limit:** 10 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | ✅ | Activation code (e.g. `MED-K7NP-3QXA`) |

**Success Response (200):**

```json
{
  "data": {
    "subscription": {
      "id": 4,
      "userId": 2,
      "planLevel": 2,
      "startDate": "2026-04-19T04:09:47.241Z",
      "endDate": "2026-05-19T04:09:47.241Z",
      "activationCodeId": 4
    },
    "user": {
      "id": 2,
      "email": "user@example.com",
      "name": "User Name",
      "planExpiresAt": "2026-05-19T04:09:47.241Z",
      "plan": { "id": 2, "name": "خطة أولى", "level": 2 }
    }
  },
  "message": "Plan activated successfully",
  "error": null
}
```

> **Concurrency guarantee:** If the same code is activated by multiple concurrent requests, exactly one succeeds with `200` and all others receive `400 Code already used`. The activation is atomic - no duplicate subscriptions are ever created.

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `code is required` | Missing field |
| 400 | `Code already used` | Code was previously activated, or lost the race to a concurrent request |
| 400 | `Code has expired` | Code expiration date passed |
| 400 | `Plan not found for this code` | No plan matches code's planLevel |
| 401 | `Unauthorized` | No or invalid token |
| 404 | `Invalid code` | Code doesn't exist |
| 429 | `Too many requests, please try again later` | Rate limit exceeded |

---

### Stats

#### GET /api/me/stats

Get the authenticated user's overall performance statistics, grouped by subsection.

**Auth:** 🔒 Required

**Success Response (200):**

```json
{
  "data": {
    "overall": { "total": 6, "correct": 4, "percentage": 67 },
    "bySubSection": [
      {
        "id": 1,
        "name": "التشريح",
        "sectionName": "السنة الأولى",
        "total": 3,
        "correct": 2,
        "percentage": 67
      }
    ]
  },
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 401 | `Unauthorized` | No or invalid token |

---

#### GET /api/me/stats/:subSectionId

Get detailed attempt history for a specific subsection.

**Auth:** 🔒 Required

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| subSectionId | integer | SubSection ID |

**Success Response (200):**

```json
{
  "data": {
    "subSectionId": 1,
    "total": 3,
    "correct": 2,
    "wrong": 1,
    "percentage": 67,
    "attempts": [
      {
        "questionText": "كم عدد عظام جسم الإنسان البالغ؟",
        "selectedAnswer": "206",
        "isCorrect": true,
        "explanation": "يحتوي جسم الإنسان البالغ على 206 عظمة."
      }
    ]
  },
  "message": null,
  "error": null
}
```

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `Invalid subSectionId` | Non-numeric parameter |
| 401 | `Unauthorized` | No or invalid token |

---

## Utility

#### GET /health

Health check endpoint.

**Auth:** None

**Success Response (200):**

```json
{
  "data": { "status": "ok", "db": "ok" },
  "message": "Server is running",
  "error": null
}
```

**Error Response (503) - DB unreachable:**

```json
{
  "data": { "status": "ok", "db": "unreachable" },
  "message": null,
  "error": "Database unreachable"
}
```

---

## Error Status Codes Reference

| Code | Meaning |
|------|---------|
| 400 | Bad Request - missing or invalid fields, or malformed JSON body |
| 401 | Unauthorized - missing or expired token |
| 403 | Forbidden - insufficient plan level |
| 404 | Not Found - resource doesn't exist |
| 409 | Conflict - duplicate resource (e.g. email) |
| 413 | Payload Too Large - request body exceeds 10 kb |
| 429 | Too Many Requests - rate limit exceeded |
| 500 | Internal Server Error - unexpected server-side failure |

---

## Notes

- `isCorrect` is **never** sent to the client in question choices - only revealed after submitting an attempt
- Each question has between **2 and 5 choices**. Empty choices are filtered server-side and never returned.
- `passwordHash` is **never** included in any response
- **Effective Plan Level:** Content access uses `effectivePlanLevel = max(self, all ancestors)`. A chapter with `requiredPlanLevel: 1` inside a subsection with `requiredPlanLevel: 2` effectively requires level 2. The API returns the computed effective level in `requiredPlanLevel`.
- Expired plans are automatically downgraded to free (level 1) daily at **00:00 Asia/Damascus**
- **Plan expiry uses a calendar-day boundary (by design).** A user whose subscription ends mid-day (e.g. at 14:00) stays on their paid plan until the next cron run at 00:00 Asia/Damascus. This is intentional product policy - do not treat it as a bug.
- Refresh tokens are stored server-side in the database - stateless refresh is not supported
- On `POST /api/auth/refresh`, the error `Refresh token expired` is **distinct** from `Invalid or expired refresh token`. The former means the server deleted the stored row and the client must force a full re-login. The latter means the JWT signature/payload failed verification.
- `POST /api/auth/logout` requires a valid access token. Only the token owner can invalidate their refresh token.
