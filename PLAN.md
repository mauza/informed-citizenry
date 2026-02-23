# Docker Support Implementation Plan

## Overview

This plan adds Docker support to the Informed Citizenry Next.js 16 project so the application can be built and run locally (or in any environment) using a container. All external services — Neon PostgreSQL, GitHub OAuth, Resend, LegiScan, Anthropic, and Stripe — remain cloud-hosted. No local service containers are introduced.

The approach uses Next.js standalone output mode, which copies only the files necessary to run the production server into the final image, resulting in a lean image without the full `node_modules` tree at runtime.

---

## Files to Create or Modify

| File | Action |
|------|--------|
| `Dockerfile` | Create — multi-stage production build |
| `docker-compose.yml` | Create — local orchestration wrapper |
| `.env.example` | Create — environment variable template |
| `.dockerignore` | Create — exclude unnecessary files from build context |
| `next.config.ts` | Modify — add `output: 'standalone'` |
| `README.md` | Modify — insert a Docker section after "Getting Started" |

---

## Step-by-Step Implementation

### Step 1 — Add `output: 'standalone'` to `next.config.ts`

**Why:** Next.js standalone mode traces and copies only the files actually needed at runtime into `.next/standalone`. This makes Docker images significantly smaller because the runner stage does not need `node_modules`.

**Current file contents** (`next.config.ts`):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.legiscan.com https://api.stripe.com https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Required change:** Add `output: 'standalone'` as a top-level property inside `nextConfig`. The existing `headers()` function must be preserved exactly. The final file should be:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.legiscan.com https://api.stripe.com https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Note on standalone and static assets:** When `output: 'standalone'` is set, `next build` places the minimal Node.js server at `.next/standalone/server.js`. However, static assets (`public/`) and the client-side CSS/JS chunks (`.next/static/`) are NOT automatically included inside `.next/standalone`. They must be copied manually in the Dockerfile runner stage (see Step 3).

---

### Step 2 — Create `.dockerignore`

**Why:** The `.dockerignore` file prevents large or sensitive directories from being sent to the Docker build daemon, which speeds up builds and prevents leaking secrets into the image.

**File to create** (`.dockerignore` in project root):

```
# Dependencies (will be reinstalled inside Docker)
node_modules
npm-debug.log*

# Next.js build output (rebuilt inside Docker)
.next

# Git metadata
.git
.gitignore

# Environment files with real secrets — never bake into image
.env.local
.env.*.local

# Drizzle migration output (not needed at runtime)
drizzle/

# Editor and OS artifacts
.DS_Store
*.log
.vscode/
.idea/
```

**Key decisions:**
- `.env.local` is excluded because secrets are passed at runtime via `docker-compose.yml` `env_file`, not baked into the image.
- `drizzle/` is excluded because schema migrations are run via `npm run db:push` outside Docker against the remote Neon DB, not inside the container.
- `node_modules` is excluded because the `deps` stage installs them fresh from `package-lock.json`.
- `.next` is excluded because the `builder` stage runs `next build` fresh.

---

### Step 3 — Create `Dockerfile`

**Why:** A multi-stage Dockerfile separates the concerns of dependency installation, building, and running, producing a minimal final image.

**Architecture — three stages:**

1. **`deps`** — Installs npm dependencies in isolation using `npm ci` (clean install from lockfile).
2. **`builder`** — Copies source + installed deps, runs `next build` to produce the standalone output and static assets.
3. **`runner`** — Copies only the files needed to serve the app: the standalone server, static assets, and public directory. Runs as a non-root user for security.

**File to create** (`Dockerfile` in project root):

```dockerfile
# syntax=docker/dockerfile:1

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# for why libc6-compat is recommended for Alpine-based Node images
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only the files needed to install dependencies
COPY package.json package-lock.json ./

# Clean install — respects exact versions in package-lock.json
RUN npm ci


# ─── Stage 2: Build the application ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files (respects .dockerignore)
COPY . .

# next build reads environment variables at build time for NEXT_PUBLIC_* vars.
# Non-public vars are only needed at runtime and are NOT required here.
# Set NEXT_TELEMETRY_DISABLED to avoid network calls during build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ─── Stage 3: Production runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone server output
COPY --from=builder /app/.next/standalone ./

# Copy static assets — these are NOT included in standalone output automatically
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the public directory (favicon, images, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone server directly with node (not npm start)
# standalone output produces server.js, not a next start wrapper
CMD ["node", "server.js"]
```

**Key decisions and rationale:**

- **`node:20-alpine`**: Alpine is used in all three stages to keep image layers small. The `libc6-compat` package is added in the `deps` stage because some npm native addons compiled against glibc fail on musl (Alpine's libc). Adding it in `deps` is sufficient since compiled artifacts are carried forward.
- **`npm ci` instead of `npm install`**: `ci` performs a clean install from `package-lock.json`, guaranteeing reproducibility.
- **`NEXT_TELEMETRY_DISABLED=1`**: Prevents Next.js from making outbound telemetry requests during build and startup, which is important inside a container that may have restricted egress.
- **Non-root user**: Running as `nextjs:nodejs` follows least-privilege principles. The `chown` flags on `COPY` instructions apply ownership without an extra `RUN chown` layer.
- **Static assets copy pattern**: When standalone mode is active, `.next/static` and `public/` must be explicitly copied into `.next/standalone/.next/static` and `.next/standalone/public` respectively. The `COPY` targets above achieve this because `WORKDIR` is `/app` and the standalone output is copied to `.` (which becomes `/app`), so `.next/static` lands at `/app/.next/static` and `public` at `/app/public` — exactly where `server.js` expects them.
- **`CMD ["node", "server.js"]`**: With standalone output, `server.js` is the entry point. `npm start` (which runs `next start`) is NOT used — `next start` requires a full Next.js installation. `server.js` is a self-contained Node.js HTTP server.
- **`ENV HOSTNAME="0.0.0.0"`**: By default Next.js standalone server binds to `127.0.0.1`, which is unreachable from outside the container. Setting `HOSTNAME` to `0.0.0.0` makes it listen on all interfaces so Docker port mapping works correctly.

**Build-time vs. runtime environment variables:**

| Variable type | When needed | How provided |
|---------------|-------------|--------------|
| `NEXT_PUBLIC_APP_URL` | Build time (inlined into JS bundles) and runtime | `docker-compose.yml` `env_file` or `--build-arg` if value differs |
| All other vars | Runtime only | `docker-compose.yml` `env_file` |

Because `NEXT_PUBLIC_APP_URL` is a `NEXT_PUBLIC_*` variable, Next.js inlines it at build time. If you run `docker build` without passing it, the value will be `undefined` in the client bundle. For local development, the value is typically `http://localhost:3000`. The `docker-compose.yml` handles this by loading `.env.local` before the build step when using Compose, but for standalone `docker build` invocations, pass `--build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000` and add `ARG NEXT_PUBLIC_APP_URL` / `ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL` to the builder stage.

**Note:** For simplicity, the `docker-compose.yml` workflow described in Step 4 is the recommended local development path. The `docker build` + `docker run` path is for CI/CD or manual use.

---

### Step 4 — Create `docker-compose.yml`

**Why:** `docker-compose.yml` provides a one-command local workflow: `docker compose up --build`. It handles the `env_file`, port mapping, and image build in a single declarative file.

**File to create** (`docker-compose.yml` in project root):

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    env_file:
      - .env.local
    ports:
      - "3000:3000"
    restart: unless-stopped
```

**Key decisions:**

- **`env_file: .env.local`**: Loads all variables from `.env.local` into the container environment at runtime. This is the same file used by `npm run dev`, so no duplication of secrets is needed.
- **`target: runner`**: Tells Compose to build up to and including the `runner` stage only (all three stages are run since `runner` depends on `builder` depends on `deps`, but this makes the intent explicit).
- **No volumes for hot reload**: This is a production-mode container. Hot module replacement requires the Next.js dev server (`npm run dev`), which is not what standalone mode provides. Developers who need HMR should continue to use `npm run dev` directly.
- **No database service**: Neon is a cloud-hosted serverless Postgres accessed over HTTP using `@neondatabase/serverless`. The `neon()` driver in `src/db/index.ts` connects to Neon's cloud endpoint directly. No local Postgres container is needed and adding one would require code changes to `src/db/index.ts` to swap the driver.
- **`restart: unless-stopped`**: Ensures the container restarts automatically on failure or system reboot, suitable for a persistent local environment.

---

### Step 5 — Create `.env.example`

**Why:** `.env.example` documents every required environment variable with placeholder values and a description. Developers copy this file to `.env.local` and fill in real values.

**Note:** The README currently has a placeholder instruction `cp .env.example .env.local  # If an example exists, or create manually`. Once this file is created, that instruction becomes fully functional.

**File to create** (`.env.example` in project root):

```env
# ─── Database ────────────────────────────────────────────────────────────────
# Neon PostgreSQL connection string (cloud-hosted, no local DB needed)
# Get from: https://console.neon.tech → your project → Connection Details
DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ─── Authentication ───────────────────────────────────────────────────────────
# Secret key used by NextAuth.js to sign session tokens
# Generate: openssl rand -base64 32
AUTH_SECRET="replace-with-openssl-rand-base64-32-output"

# GitHub OAuth App credentials
# Create at: https://github.com/settings/developers → OAuth Apps → New OAuth App
# Authorization callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID="your-github-oauth-app-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-app-client-secret"

# ─── Email ────────────────────────────────────────────────────────────────────
# Resend API key for sending magic link emails
# Get from: https://resend.com/api-keys
RESEND_API_KEY="re_your_resend_api_key"

# Verified sender address in Resend (must match a verified domain)
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# ─── Legislative Data ─────────────────────────────────────────────────────────
# LegiScan API key for syncing bill and voting data
# Get from: https://legiscan.com/legiscan (contact for API access)
LEGISCAN_API_KEY="your-legiscan-api-key"

# ─── AI ───────────────────────────────────────────────────────────────────────
# Anthropic Claude API key for generating bill summaries
# Get from: https://console.anthropic.com/keys
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key"

# ─── Payments ─────────────────────────────────────────────────────────────────
# Stripe secret key (use sk_test_... for development, sk_live_... for production)
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"

# Stripe webhook signing secret for verifying /api/stripe/webhook events
# Get from: https://dashboard.stripe.com/webhooks → your endpoint → Signing secret
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"

# Stripe Price ID for the premium subscription product
# Get from: https://dashboard.stripe.com/products → your product → Pricing section
STRIPE_PREMIUM_PRICE_ID="price_your-stripe-price-id"

# ─── Cron Jobs ────────────────────────────────────────────────────────────────
# Bearer token required to call /api/cron/* endpoints
# Generate: openssl rand -base64 32
CRON_SECRET="replace-with-openssl-rand-base64-32-output"

# ─── App URL ──────────────────────────────────────────────────────────────────
# Public base URL of the application (used in Stripe redirect URLs)
# For local development: http://localhost:3000
# IMPORTANT: This is a NEXT_PUBLIC_ variable — it is inlined into client bundles
# at build time. Change it before building for a different environment.
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### Step 6 — Update `README.md`

**Why:** Developers need instructions on how to use Docker. A "Docker" section placed after the existing "Getting Started" section is the natural location.

**Where to insert:** After the closing ` ``` ` of the "### 5. Run the development server" subsection (line 89 in the current file, after `Open [http://localhost:3000](http://localhost:3000) to see the app.`) and before the `## Environment Variables` section header (line 91).

**New section to insert:**

```markdown
## Docker

Docker provides an alternative way to run the application locally without installing Node.js directly on your machine. The container runs the Next.js production server using the standalone output mode.

> **Note:** All external services (Neon DB, GitHub OAuth, Resend, LegiScan, Anthropic, Stripe) remain cloud-hosted. You still need valid API credentials in `.env.local`.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux)

### 1. Set up environment variables

If you have not already done so, copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace all placeholder values with real credentials. See [Environment Variables](#environment-variables) for details on each variable.

### 2. Build and start the container

```bash
docker compose up --build
```

This command:
- Builds a multi-stage Docker image (deps → builder → runner)
- Runs `next build` inside the `builder` stage using standalone output mode
- Starts a minimal production container that reads from `.env.local`

The app will be available at [http://localhost:3000](http://localhost:3000).

### 3. Stop the container

```bash
docker compose down
```

### One-off docker build and run (without Compose)

```bash
# Build the image
docker build -t informed-citizenry .

# Run the container, loading variables from .env.local
docker run --env-file .env.local -p 3000:3000 informed-citizenry
```

### Notes

- **Production mode only:** The Docker setup runs `next start` via the standalone `server.js`. Hot module replacement (HMR) is not available. For active development with HMR, use `npm run dev` directly.
- **Database migrations:** Run `npm run db:push` from your local machine (not inside Docker) to push schema changes to Neon before starting the container.
- **NEXT_PUBLIC_APP_URL:** This variable is inlined into JavaScript bundles at build time. If you change it, rebuild the image with `docker compose up --build`.
- **Stripe webhooks locally:** The running container accepts inbound webhook events if you expose port 3000 via a tunnel tool (e.g., [Stripe CLI](https://stripe.com/docs/stripe-cli) `stripe listen --forward-to localhost:3000/api/stripe/webhook`).
```

**Exact insertion point in `README.md`:** Between line 89 (`Open [http://localhost:3000](http://localhost:3000) to see the app.`) and line 91 (`## Environment Variables`). Insert a blank line, then the full `## Docker` section block above, then another blank line before `## Environment Variables`.

---

## Sequencing and Dependencies

The steps have the following dependency order:

```
Step 1 (next.config.ts)  ──┐
Step 2 (.dockerignore)   ──┤
                           ├──► Step 3 (Dockerfile)  ──┐
Step 5 (.env.example)    ──┘                           ├──► Step 4 (docker-compose.yml)
                                                       └──► Step 6 (README.md)
```

- Step 1 must happen before Step 3 is tested, because `next build` inside the Dockerfile will produce standalone output only if `output: 'standalone'` is present in `next.config.ts` at build time.
- Step 2 (`.dockerignore`) must exist before running `docker build` to prevent large directories from bloating the build context.
- Steps 1 and 2 can be done in any order relative to each other.
- Step 5 (`.env.example`) is independent of all other steps but should be created before Step 6 (README) because the README references it.
- Step 4 (docker-compose.yml) can be written before or after Step 3, but cannot be tested until Step 3 exists.

**Recommended implementation order:** 2 → 1 → 5 → 3 → 4 → 6

---

## Potential Issues and Mitigations

### Issue 1: `NEXT_PUBLIC_APP_URL` baked at build time

`NEXT_PUBLIC_*` variables are inlined into JavaScript bundles by webpack at `next build` time. If this variable is not present in the environment when `npm run build` runs inside the `builder` stage, client-side code that references `process.env.NEXT_PUBLIC_APP_URL` will receive `undefined`.

**Mitigation:** The `docker-compose.yml` `env_file` loads variables for runtime but NOT for the build step. For `docker compose up --build`, the build environment does not inherit `.env.local` automatically.

**Solution options:**
1. Accept `http://localhost:3000` as a hardcoded default during the build stage in the Dockerfile using `ENV NEXT_PUBLIC_APP_URL=http://localhost:3000` in the `builder` stage. This is appropriate for local development use.
2. Pass it as a build argument: add `ARG NEXT_PUBLIC_APP_URL` and `ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL` to the builder stage, then pass `--build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000` at build time.

For this local Docker setup, option 1 is simplest. Add to the `builder` stage in `Dockerfile`:
```dockerfile
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Issue 2: GitHub OAuth callback URL

When running via Docker on `localhost:3000`, the GitHub OAuth App's "Authorization callback URL" must be set to `http://localhost:3000/api/auth/callback/github`. This is a GitHub App configuration change, not a code change. Document this in the README Docker section.

### Issue 3: Stripe webhook delivery to localhost

Stripe cannot deliver webhook events to `localhost`. The README Docker section already notes using the Stripe CLI's `stripe listen` command to forward events.

### Issue 4: `libc6-compat` on Alpine

Some npm packages with native addons (or packages that shell out to system binaries) may fail on Alpine without `libc6-compat`. The `COPY --from=deps` pattern carries compiled artifacts from the `deps` stage. `libc6-compat` is installed only in `deps` — it is also needed in `builder` and `runner` if any native binding is invoked during build or at runtime.

**Mitigation:** Add `RUN apk add --no-cache libc6-compat` to both the `builder` and `runner` stages as a precaution. This is cheap (small package) and prevents hard-to-debug runtime failures.

### Issue 5: `.next/static` path in standalone output

The Next.js standalone server expects static assets at a specific relative path. The exact COPY commands in the Dockerfile must match what `server.js` expects. The pattern established in the official Next.js Docker example is:

```dockerfile
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```

With `WORKDIR /app`, this results in:
- `/app/server.js` — the entry point
- `/app/.next/static` — compiled client assets
- `/app/public` — static public files

This matches what `server.js` serves. Do not alter these paths.

---

## Verification Checklist

After implementation, verify the following:

- [ ] `next.config.ts` contains `output: "standalone"` alongside the existing `headers()` function, with no syntax errors
- [ ] Running `npm run build` locally produces a `.next/standalone/` directory
- [ ] `.dockerignore` exists and contains `node_modules`, `.next`, `.env.local`, `.git`, `drizzle/`
- [ ] `.env.example` contains all 13 variables listed in the Requirements section
- [ ] `docker build -t informed-citizenry .` completes without errors
- [ ] `.next/standalone/server.js` exists in the built image (verify with `docker run --rm informed-citizenry ls .next/standalone/`)
- [ ] `docker compose up --build` starts the container and the app responds at `http://localhost:3000`
- [ ] The app loads without JavaScript errors in the browser console
- [ ] Authentication flow works (GitHub OAuth callback redirects correctly to `localhost:3000`)
- [ ] `README.md` Docker section renders correctly with working code blocks
- [ ] `cp .env.example .env.local` works and produces a usable template

---

## Final File Contents Reference

### `Dockerfile` (complete)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### `docker-compose.yml` (complete)

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    env_file:
      - .env.local
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### `.dockerignore` (complete)

```
node_modules
npm-debug.log*
.next
.git
.gitignore
.env.local
.env.*.local
drizzle/
.DS_Store
*.log
.vscode/
.idea/
```

### `next.config.ts` (complete, modified)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.legiscan.com https://api.stripe.com https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```
