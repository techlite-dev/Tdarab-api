# TDARAB API Documentation

**Base URL:** `https://api.example.com`  
**Version:** 1.1.0  
**Last Updated:** April 19, 2026  
**Format:** All responses follow `{ data, message, error }`

---

## Test Credentials

Use these accounts during development. Both share the same password: `123456`

| Email | Plan | Level | Use Case |
|-------|------|-------|----------|
| test@example.com | خطة أولى | 2 | Full access - can view all sections and questions |
| free@example.com | مجاني | 1 | Limited access - test locked content and upgrade flow |

**Test Activation Codes:**

| Code | Status | Use Case |
|------|--------|----------|
| TEST-CODE-2026 | ✅ Valid | Activate to upgrade free user to level 2 |
| TEST-CODE-2026-2 | ✅ Valid | Second valid code — useful for testing activation after logout/re-login or a second user |
| USED-CODE-2026 | ❌ Used | Test "Code already used" error |
| EXPR-CODE-2026 | ❌ Expired | Test "Code has expired" error |

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

---

#### POST /api/auth/logout

Invalidate a refresh token (remove from DB).

**Auth:** None

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

---

### Content

#### GET /api/sections

Get all sections with their subsections and user progress stats. Locked sections/subsections return minimal data.

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
          "totalQuestions": 2,
          "userStats": { "answered": 3, "correct": 2 }
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

Get subsections for a specific section with progress stats.

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
      "totalQuestions": 2,
      "userStats": { "answered": 3, "correct": 2 }
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

#### GET /api/subsections/:id/questions

Get questions for a specific subsection. Locked questions return minimal data. `isCorrect` is **never** included in choices.

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
      "text": "كم عدد عظام جسم الإنسان البالغ؟",
      "imageUrl": null,
      "requiredPlanLevel": 1,
      "choices": [
        { "id": 1, "text": "206" },
        { "id": 2, "text": "208" },
        { "id": 3, "text": "210" },
        { "id": 4, "text": "212" }
      ]
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
| 403 | `Access denied` | User plan level too low for subsection |
| 404 | `SubSection not found` | Invalid subsection ID |

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

**Error Responses:**

| Status | Error | When |
|--------|-------|------|
| 400 | `questionId and selectedChoiceId are required` | Missing fields |
| 400 | `Invalid choice for this question` | Choice doesn't belong to question |
| 401 | `Unauthorized` | No or invalid token |
| 403 | `Access denied` | User plan level too low |
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

Get all available plans. No authentication required.

**Auth:** None

**Success Response (200):**

```json
{
  "data": [
    { "id": 1, "name": "مجاني", "level": 1, "price": 0, "currency": "USD" },
    { "id": 2, "name": "خطة أولى", "level": 2, "price": 9.99, "currency": "USD" }
  ],
  "message": null,
  "error": null
}
```

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

> 🔒 **Concurrency guarantee:** If the same code is activated by multiple concurrent requests, exactly one succeeds with `200` and all others receive `400 Code already used`. The activation is atomic — no duplicate subscriptions are ever created.

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
  "data": { "status": "ok" },
  "message": "Server is running"
}
```

---

## Error Status Codes Reference

| Code | Meaning |
|------|---------|
| 400 | Bad Request  - missing or invalid fields, or malformed JSON body |
| 401 | Unauthorized  - missing or expired token |
| 403 | Forbidden  - insufficient plan level |
| 404 | Not Found  - resource doesn't exist |
| 409 | Conflict  - duplicate resource (e.g. email) |
| 413 | Payload Too Large  - request body exceeds 10 kb |
| 429 | Too Many Requests  - rate limit exceeded |
| 500 | Internal Server Error  - unexpected server-side failure |

---

## Notes

- `isCorrect` is **never** sent to the client in question choices  - only revealed after submitting an attempt
- `passwordHash` is **never** included in any response
- Expired plans are automatically downgraded to free (level 1) daily at **00:00 Asia/Damascus**
- **Plan expiry is enforced on a calendar-day boundary (by design).** A user whose subscription ends mid-day (for example at 14:00) remains on their paid plan until the next daily cron run at 00:00 Asia/Damascus. This is an intentional product policy — **do not treat a user remaining on a paid plan a few hours after their `planExpiresAt` timestamp as a bug**.
- Refresh tokens are stored server-side in the database  - stateless refresh is not supported
- On `POST /api/auth/refresh`, the error `Refresh token expired` is **distinct** from `Invalid or expired refresh token`. The former means the server deleted the stored row and the client must force a full re-login. The latter means the JWT signature/payload failed verification.
