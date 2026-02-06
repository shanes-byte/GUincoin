# Guincoin Rewards Platform - Agent Instructions

## MANDATORY: Read Before Making Any Changes

Before modifying ANY code in this project, you MUST:

1. **Read `CODE_MAP.md`** at the project root — it contains a complete function-level dependency map of the entire codebase
2. **Follow the Safe Change Protocol** defined below

## Safe Change Protocol

For every code change, follow these steps IN ORDER:

### Step 1: Trace Dependencies
Search all imports, references, and usages of the affected code across backend, frontend, and config files. Use the dependency map in `CODE_MAP.md` to identify every caller, consumer, and reference.

### Step 2: List Breakage Points
Document every route, service, component, or test that could be impacted by your change. Check both direct and transitive dependencies.

### Step 3: Preserve Original Code
Comment out the original implementation with a dated note before replacing it:
```typescript
// [ORIGINAL - YYYY-MM-DD] Description of what was here
// original code here...
```

### Step 4: Make the Change
Implement the modification.

### Step 5: Verify Dependencies
Confirm each identified dependency still works with the new behavior. Check that types, return values, and side effects are compatible.

## Project Overview

- **What**: Employee rewards platform (coin allotments, peer transfers, wellness tasks, product store, campaigns, gaming)
- **Stack**: Node.js/Express + TypeScript backend, React + TypeScript frontend, PostgreSQL + Prisma ORM
- **Auth**: Google OAuth via Passport.js, session-based
- **Deploy**: Railway, Docker Compose for local dev

## Key Architecture Rules

1. **All financial operations use Decimal(10,2)** — never use floating-point for money
2. **Transaction lifecycle**: pending → posted → balance update (via `transactionService.postTransaction()`)
3. **Middleware order in server.ts matters** — helmet → CORS → body parser → session → passport → CSRF → rate limiting
4. **CSRF exempt paths**: `/api/auth/google`, `/api/auth/google/callback`, `/api/integrations/google-chat`
5. **Auto-admin emails** hardcoded in `backend/src/config/auth.ts`: shanes@guinco.com, landonm@guinco.com
6. **Frontend builds to** `backend/frontend-dist` for production serving
7. **Session store**: PostgreSQL (memory fallback in dev)
8. **All UUIDs**: No auto-increment IDs anywhere

## Critical Files (Modify With Extra Care)

| File | Why It's Critical |
|------|-------------------|
| `backend/prisma/schema.prisma` | All 26+ models, relations, enums — changes cascade everywhere |
| `backend/src/server.ts` | Middleware order, route mounting, session config |
| `backend/src/services/transactionService.ts` | Core financial logic, balance calculations |
| `backend/src/services/allotmentService.ts` | Manager budget logic |
| `backend/src/config/auth.ts` | OAuth flow, auto-admin, pending claim logic |
| `frontend/src/services/api.ts` | Every frontend API call defined here |

## Quick Commands

```bash
# Local development
cd backend && npm run dev          # Backend on port 5000
cd frontend && npm run dev         # Frontend on port 3000

# Database
cd backend && npm run migrate      # Run Prisma migrations
cd backend && npm run studio       # Open Prisma Studio

# Production build
npm run build                      # Builds frontend → backend/frontend-dist
cd backend && npm start            # Runs migrations + starts server

# Tests
cd backend && npm test
cd frontend && npm test
```
