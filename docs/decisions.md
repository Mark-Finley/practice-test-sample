# Architectural Decisions Record

## 1. Monorepo Strategy: NPM Workspaces
* **Decision:** Use NPM Workspaces instead of pnpm or Yarn workspaces.
* **Justification:** Keeps scaffolding simple with standard Node.js installations, reducing dev setup complexity since npm is bundled with Node.js.
* **Structure:**
  * Root workspace manages shared configurations (ESLint, Prettier).
  * `apps/web`: Next.js frontend (Client portal and Admin workspace).
  * `apps/api`: NestJS backend (REST endpoints, WebSockets, proctoring alerts, queue services).

## 2. Framework Selections
* **Frontend:** Next.js (App Router, Tailwind CSS, TypeScript). Excellent integration with Vercel for instant deployments.
* **Backend:** NestJS (TypeScript). Offers modular decorators, separation of controllers and services, and strong DI.

## 3. Database Layer: Prisma 7 & Supabase
* **Decision:** Utilize Prisma 7 ORM connected to Supabase in production and local Postgres during offline setups.
* **Integration Update:** Under Prisma 7, connection strings must not be defined directly in `schema.prisma`. They are loaded dynamically in `prisma.config.ts` via `process.env.DATABASE_URL` / `env("DATABASE_URL")`.
* **Pooling:** Supabase transaction pooling will be active in production using pooled connection URLs for runtime queries, and direct connections for schema migrations.

## 4. Shared Code Quality Configs
* **Decision:** Standard Prettier configuration placed at the root level `.prettierrc`, with local project configurations falling back to it. ESLint rules are managed locally under next-eslint and nest-eslint setups respectively.

---

## Phase 2 Decisions

## 5. Explicit Role-Permission Mapping (RBAC)
* **Decision:** Implement an explicit relational model linking `User`, `Role`, `Permission`, and join-table `RolePermission` rather than mapping JSON parameters.
* **Justification:** Relational constraints ensure database level consistency, allow performant queries via index matches, and map easily to Prisma include statements.

## 6. Authentication Architecture
* **Decision:** Use passport-jwt and bcrypt for security.
* **Flow:**
  * Endpoint `POST /auth/register` hashes passwords with 10 salt rounds and creates standard `CANDIDATE` accounts.
  * Endpoint `POST /auth/login` validates credentials and issues a JWT token expiring in 1 day.
  * Endpoint `GET /auth/me` validates the token, queries the active database user, and returns user details with associated role and list of permissions.

## 7. Global API Validation & Prefixing
* **Decision:** Enable `ValidationPipe` globally inside NestJS (`main.ts`) configured with `transform: true` and `forbidNonWhitelisted: true`, and enforce the `/api/v1` global routing prefix.
* **Justification:** Prevents unvalidated or malformed body payloads from reaching controller handlers, and structures endpoints cleanly for future api versioning.

## 8. Frontend Session Client State
* **Decision:** Implement a Zustand-based client state manager (`apps/web/src/store/auth.ts`) coupled with a custom Fetch API client wrapper (`apps/web/src/services/api.ts`).
* **Justification:** Avoids heavy context providers, allows quick selectors inside React components, and automatically injects Bearer token headers into outgoing requests.

---

## Phase 3 Decisions

## 9. Tenant Modeling & Relationships
* **Decision:** Implement the `Organization` model and establish a nullable one-to-many relationship with `User` (`onDelete: SetNull`).
* **Justification:** This maps candidates to specific organizations while ensuring deleting an organization does not cascade delete its users, preserving exam attempt history records.

## 10. Local File Upload Fallback
* **Decision:** Create a `StorageService` saving uploaded files to `apps/api/uploads/` and serve them statically via NestJS's Express instances under `/uploads/*`.
* **Justification:** Avoids requiring a running MinIO or S3 bucket during development and provides simple, local file persistence.

## 11. Path Aliases in Next.js
* **Decision:** Enforce absolute path imports utilizing the `@/*` prefix mapping configured in `tsconfig.json`.
* **Justification:** Resolves type checker problems and relative import depth errors when nested routing folders (like `/src/app/admin/dashboard/page.tsx`) reference services or states.
