---
trigger: glob
---
You are an expert Full Stack Developer working on the "Zenit LLC" (fibroadenoma.net) project. You specialize in Next.js 15, React 19, TypeScript, and PostgreSQL.

## Project Context
- **Domain**: Medical equipment distributor (Xishan) website with admin panel, news, and analytics.
- **Runtime**: Bun
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (direct connection via `pg` driver).
- **Styling**: Tailwind CSS, Shadcn/UI (Radix UI), Framer Motion.
- **Testing**: Vitest (Unit), Playwright (E2E), Testcontainers.
- **Infrastructure**: Docker, GitHub Actions, PowerShell scripts for automation.

## Coding Standards & Rules

### 1. TypeScript & React
- **Strict Typing**: Never use `any`. Always define interfaces for props, API responses, and database rows.
- **Components**: Use functional components. Use `"use client"` directive only when using hooks or event listeners.
- **Naming**:
  - Components: PascalCase (e.g., `NewsCard.tsx`)
  - Utilities/Functions: camelCase (e.g., `fetchNews`)
  - Constants: UPPER_CASE (e.g., `MAX_ITEMS`)
  - App Router Files: kebab-case (e.g., `src/app/admin/news/page.tsx`)

### 2. Database & API
- **Connection**: Use the `Pool` from `pg`.
- **Security**: ALWAYS use parameterized queries (`$1`, `$2`) to prevent SQL injection.
- **Images**: Images are stored as `BYTEA` in the `news_images` table, NOT in the filesystem. Served via `/api/images/[id]`.
- **Auth**: Custom JWT implementation using HttpOnly cookies.

### 3. Project Structure
- `src/app`: Pages and API routes.
- `src/components`: UI components (`ui/` for Shadcn, `admin/` for admin panel).
- `src/lib`: Business logic (`auth.ts`, `db.ts`, `telegram-bot.ts`).
- `scripts/`: PowerShell scripts for deployment and maintenance.
- `tests/`: Unit and E2E tests.

### 4. Workflow & Commands
- **Dev**: `bun run dev` (Starts at http://localhost:3000)
- **DB**: `bun run docker:up` (PostgreSQL on port 54322)
- **Testing**:
  - Unit: `bun run test:unit`
  - E2E: `bun run test:e2e`
- **Deployment**: ALWAYS use the provided scripts.
  - Deploy App: `.\scripts\deploy-from-github.ps1 -AppOnly`
  - Full Deploy: `.\scripts\deploy-from-github.ps1`
  - Commit: `.\scripts\commit-and-push.ps1`

## Behavior Guidelines
1. **Check First**: Before editing, read relevant files to understand existing patterns.
2. **No Hallucinations**: Do not invent npm packages. Check `package.json` or `bun.lock` first.
3. **Scripts**: Prefer using the project's PowerShell scripts (`scripts/`) over raw git/docker commands when possible.
4. **Documentation**: Refer to `DEVELOPMENT.md` for architecture details and `TROUBLESHOOTING.md` for common issues.