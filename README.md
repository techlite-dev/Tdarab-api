# TDARAB API

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)]()
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)]()
[![PM2](https://img.shields.io/badge/PM2-2B037A?logo=pm2&logoColor=white)]()

Medical MCQ Question Bank API — Backend service for the TDARAB medical education platform.

## Overview

TDARAB is a medical education platform serving MCQ questions to students. This repository contains the backend API that powers the platform.

## Features

- **Authentication**: JWT-based auth with refresh tokens stored server-side
- **Content Access Control**: Plan-based locking across the full hierarchy (sections, subsections, chapters, questions)
- **Content Tree**: Plans endpoint returns full hierarchical content tree for pricing and feature pages
- **Question Bank**: MCQ questions organized under chapters with images and explanations
- **User Statistics**: Track progress and performance per chapter and subsection
- **Activation Codes**: One-time codes for subscription upgrades
- **Security Hardening**: Rate limiting on all auth routes, max refresh tokens per user, max attempts per question
- **Cron Jobs**: Automatic plan downgrade and token cleanup

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (access token: 15min, refresh token: 30 days)
- **Security**: bcrypt, express-rate-limit, CORS, helmet-ready

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create `.env` file (see `.env.example`):

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3000
ALLOWED_ORIGINS="https://yourdomain.com,http://localhost:3000"
```

### Database Setup

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### Run

```bash
npm run dev    # Development
npm start      # Production
```

## API Documentation

Full interactive documentation: [docs/index.html](docs/index.html)

**Version:** 1.3.0 - See [docs/api.md](docs/api.md) for the full reference.

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Authenticate
- `POST /api/auth/refresh` — Get new access token
- `POST /api/auth/logout` — Invalidate refresh token

### Content
- `GET /api/sections` — List all sections with subsection summaries
- `GET /api/sections/:id/subsections` — Get subsections with chapter summaries and user stats
- `GET /api/chapters/subsection/:id` — Get chapters for a subsection with user stats
- `GET /api/chapters/:id/questions` — Get questions for a chapter

### Attempts
- `POST /api/attempts` — Submit answer

### User
- `GET /api/me` — Get profile
- `GET /api/plans` — List plans with full content tree per plan level
- `POST /api/activate` — Activate subscription code

### Stats
- `GET /api/me/stats` — Overall statistics
- `GET /api/me/stats/:id` — Subsection statistics

## Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "message": "Human-readable message or null",
  "error": "Error description or null"
}
```

## Security Notes

- `isCorrect` is **never** included in question choices — only revealed after submitting an attempt
- `passwordHash` is **never** included in any response
- Refresh tokens are stored server-side in the database
- Each question returns between **2 and 5 choices** - empty choices are filtered server-side and never returned

## Deployment

PM2 configuration included in `ecosystem.config.js`.

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## License

Private — All rights reserved.

---

Built by [Techlite](https://techlite.dev)
