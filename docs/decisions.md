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

---

## Phase 4 Decisions

## 12. Question Model Normalization
* **Decision:** De-normalize options into a separate relational `QuestionOption` entity, while binding questions to specific `QuestionBank` and `QuestionCategory` entities (cascading on delete).
* **Justification:** Avoids storing choices inside unstructured JSON arrays, ensuring database-level type-safety and efficient indexing of exam questions.

## 13. Choice Correctness Validation
* **Decision:** Enforce logical constraints checking option parameters based on question type:
  * `SINGLE_CHOICE`: Checks that exactly one option is marked correct.
  * `MULTIPLE_CHOICE`: Checks that at least one option is marked correct.
* **Justification:** Enforcing this inside the backend services blocks malformed requests or incomplete manual entries from contaminating active question pools.

## 14. Serverless-Compatible Background Parsing
* **Decision:** Implement a regex-free comma split parser to processes CSV payloads synchronously in a database transaction within the request thread context (falling back from BullMQ).
* **Justification:** Ensures complete compatibility with serverless context (like Vercel) where persistent background workers and local Redis connections are unavailable.

---

## Phase 5 Decisions

## 15. Exam Template Modeling
* **Decision:** Implement an explicit `ExamTemplate` entity mapped to `QuestionBank`, with weight allocations defined in a child table `ExamTemplateCategoryWeight`.
* **Justification:** Relational weight mappings ensure constraints can be easily defined and audited.

## 16. Domain Weight Allocations Guard
* **Decision:** Implement a backend service validator ensuring the sum of all category counts (`questionCount`) in a template matches the declared `totalQuestions` integer.
* **Justification:** Prevents creating blueprints that would cause the active exam engine to fail or hang when generating random question subsets from categories.

## 17. Live Weight Match Ticker in Frontend
* **Decision:** Design a dynamic validator in the Admin Templates Builder page that sums weights as the user edits values, dynamically displaying a green check badge when matching or a red mismatch badge, and disabling the submit button on error.
* **Justification:** Provides direct visual feedback to admins, avoiding backend API round-trip errors.

---

## Phase 6 Decisions

## 18. Normalized Session Questions Mapping via Answer
* **Decision:** Instantiate `Answer` placeholder records with unique sequential `sortOrder` values for all template-selected questions at the time the `ExamSession` is initialized.
* **Justification:** Persisting the randomized sequence of questions directly in the relational schema ensures that the candidate's exact presentation sequence is preserved in the database. This protects against timer drift/resets, maintains a deterministic sequence for proctor audit logs, and prevents question list changes upon browser page refreshes.

## 19. All-or-Nothing Option Grading
* **Decision:** Score single-choice and multiple-choice questions on an all-or-nothing basis where a user must select all correct choices and zero incorrect choices to receive points.
* **Justification:** Aligns directly with standard vendor examinations (AWS, CompTIA) where no partial credit is awarded.

## 20. Dynamic Server-Side Time Limit Enforcement
* **Decision:** Calculate the exam session's remaining time dynamically on the backend based on elapsed time since the session's `startedAt` timestamp, instead of relying solely on client-supplied parameters.
* **Justification:** Protects the integrity of high-stakes practice runs against candidate timer manipulation via the browser console or network request hijacking. Auto-submits the exam once the elapsed duration is exceeded.

---

## Phase 7 Decisions

## 21. Dynamic Candidate Dashboard Metrics
* **Decision:** Query all candidate mock exam attempts from the reports endpoint `/reports/candidate/attempts` on dashboard mount, calculating average score, total attempts run, and passing metrics dynamically in React client state.
* **Justification:** Avoids building heavy backend aggregation queries or holding duplicate cached statistical fields in the candidate user schema, ensuring rapid dashboard page rendering.

---

## Phase 8 Decisions

## 22. Server-Assigned Proctoring Ingestion Telemetry
* **Decision:** Ingest focus shifts/blur anomalies from player windows immediately via `POST /exams/sessions/:id/proctor/log` when tab changes occur, and stamp them in the `ProctorLog` table database-side.
* **Justification:** Guarantees that candidates' tab blur metrics are synchronized in the audit database in real-time, preventing attempts to bypass focus logging via hard window reloads or disconnection.

## 23. Candidate Proctoring Trust Score
* **Decision:** Dynamically calculate the candidate's Proctor Trust Score on the admin timeline page using a mathematical penalty algorithm (100% minus 25% times violations count) instead of keeping a static database field.
* **Justification:** Minimizes data caching synchronization bugs and automatically handles audits of active vs completed test runs.

---

## Phase 9 Decisions

## 24. Server-Side Programmatic PDF Certificate Generation
* **Decision:** Generate PDF certificates programmatically on the NestJS backend using `pdfkit` and stream raw binaries directly to authorized client download requests.
* **Justification:** Avoids running complex headless browser instances (such as Puppeteer) on the server, saving CPU memory resources while guaranteeing high-precision layout rendering.

## 25. REST Streamed CSV Exports
* **Decision:** Format admin attempt sheets directly into raw comma-separated CSV text on the server, streaming responses with `Content-Type: text/csv` rather than generating static disk assets.
* **Justification:** Prevents file system fragmentation and security risks associated with storing temporary report artifacts in the API workspace.

---

## Phase 10 Decisions

## 26. Database Foreign Key Indexing (@@index)
* **Decision:** Add database indexing configurations on high-frequency query parameters in Prisma (`Question.bankId`, `Question.categoryId`, `ExamSession.candidateId`, `ExamSession.status`, `Answer.sessionId`, `Answer.questionId`, and `ProctorLog.sessionId`).
* **Justification:** Optimizes search operations and foreign key joins, reducing DB read latency to sub-millisecond ranges even when scaling to thousands of concurrent mock sessions.

## 27. Tiered API Rate Limiting (ThrottlerGuard)
* **Decision:** Install `@nestjs/throttler` to establish global client limits (max 100 requests per minute per IP), with a specific override on the database-intensive `saveAnswer` endpoint (max 20 saves per minute).
* **Justification:** Protects the platform from denial-of-service (DoS) attempts, API automation abuse, and write-stream database congestion.
