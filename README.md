# Informed Citizenry

> A SaaS civic tech platform that helps citizens stay informed about legislation, track how their representatives vote, and understand how well those representatives align with public opinion.

## Features

### Free Tier
- Browse current bills with AI-generated summaries
- View legislator profiles and voting records
- Track bill status and recent actions
- Basic representation scoring (how well legislators reflect constituent views)
- Submit sentiment on bills (support/oppose)

### Premium Tier
- Advanced analytics on representation alignment
- Priority AI bill summaries
- Historical voting data access
- Enhanced district insights

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI Components | [Radix UI](https://www.radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| Auth | [NextAuth.js v5](https://authjs.dev) (Database strategy) |
| Database | [Neon PostgreSQL](https://neon.tech) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| AI | [Anthropic Claude](https://anthropic.com) (via SDK) |
| Payments | [Stripe](https://stripe.com) |
| Email | [Resend](https://resend.com) |
| Testing | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |

## Prerequisites

- **Node.js**: v20+ (recommended: use nvm)
- **Package Manager**: npm (comes with Node.js)
- **Accounts Required**:
  - [Neon](https://neon.tech) - PostgreSQL database
  - [GitHub](https://github.com) - OAuth authentication
  - [Resend](https://resend.com) - Transactional emails (magic links)
  - [LegiScan](https://legiscan.com) - Bill and voting data
  - [Anthropic](https://console.anthropic.com) - AI bill summaries
  - [Stripe](https://stripe.com) - Subscription payments

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mauza/informed-citizenry.git
cd informed-citizenry
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local  # If an example exists, or create manually
```

Fill in all required variables (see [Environment Variables](#environment-variables) below).

### 4. Set up the database

```bash
# Push the database schema
npm run db:push

# (Optional) Open Drizzle Studio to manage data
npm run db:studio
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

| Variable | Required | Description | Where to Get It |
|----------|----------|-------------|-----------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string | [Neon Dashboard](https://console.neon.tech) |
| `AUTH_SECRET` | Yes | Secret key for NextAuth.js session encryption | Generate: `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID | [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers) |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret | Same as above |
| `RESEND_API_KEY` | Yes | Resend API key for sending emails | [Resend Dashboard](https://resend.com) |
| `RESEND_FROM_EMAIL` | Yes | Verified sender email address | Verify domain in Resend |
| `LEGISCAN_API_KEY` | Yes | LegiScan API key for bill data | [LegiScan API](https://legiscan.com) (contact for access) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude | [Anthropic Console](https://console.anthropic.com) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (test or live) | [Stripe Dashboard](https://dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook endpoint secret | Stripe Dashboard > Webhooks |
| `STRIPE_PREMIUM_PRICE_ID` | Yes | Stripe price ID for premium subscription | Stripe Dashboard > Products |
| `CRON_SECRET` | Yes | Secret token for securing cron job endpoints | Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (used for Stripe redirects) | `http://localhost:3000` (dev) or your domain |

### Example `.env.local`

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
AUTH_SECRET="your-generated-secret-here"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

RESEND_API_KEY="re_your_resend_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

LEGISCAN_API_KEY="your-legiscan-api-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PREMIUM_PRICE_ID="price_..."

CRON_SECRET="your-cron-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Next.js development server (HMR enabled) |
| `npm run build` | Build the application for production |
| `npm start` | Start the production server (requires `build` first) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run db:push` | Push Drizzle schema changes to the database |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:studio` | Open Drizzle Studio (GUI for database management) |
| `npm run test` | Run all tests once with Vitest |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Run tests and generate coverage report |

## Project Structure

```
informed-citizenry/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── auth/            # NextAuth.js handlers
│   │   │   ├── cron/            # Scheduled job endpoints
│   │   │   │   ├── sync-legiscan/      # Sync bills from LegiScan
│   │   │   │   ├── generate-summaries/ # Generate AI summaries
│   │   │   │   └── update-scores/      # Update representation scores
│   │   │   └── stripe/          # Stripe checkout & webhooks
│   │   ├── (main)/             # Main app pages (authenticated)
│   │   │   ├── page.tsx         # Landing/home page
│   │   │   ├── dashboard/       # Authenticated user dashboard
│   │   │   ├── bills/           # Bill listings & details
│   │   │   ├── legislators/     # Legislator listings & profiles
│   │   │   ├── my-votes/        # User's recorded sentiments
│   │   │   ├── settings/        # User settings
│   │   │   └── login/           # Authentication page
│   │   ├── layout.tsx           # Root layout with providers
│   │   └── globals.css          # Global styles
│   ├── auth/                   # NextAuth.js configuration
│   │   └── index.ts
│   ├── components/             # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── bills/               # Bill-related components
│   │   ├── legislators/         # Legislator-related components
│   │   ├── navbar.tsx
│   │   ├── sign-in-form.tsx
│   │   ├── upgrade-button.tsx
│   │   └── premium-gate.tsx
│   ├── db/                     # Database configuration
│   │   ├── index.ts             # Database connection (Neon)
│   │   └── schema.ts            # Drizzle schema definitions
│   ├── lib/                    # Utility functions & business logic
│   │   ├── actions/             # Server actions
│   │   │   ├── sentiment.ts     # Bill sentiment CRUD
│   │   │   ├── ai-summary.ts    # AI summary actions
│   │   │   └── profile.ts       # User profile actions
│   │   ├── legiscan.ts          # LegiScan API integration
│   │   ├── ai-summary.ts        # Anthropic Claude integration
│   │   ├── stripe.ts            # Stripe client & config
│   │   ├── queries.ts           # Database queries
│   │   ├── representation-score.ts  # Score calculation logic
│   │   └── utils.ts             # Helper utilities (cn, etc.)
│   └── test/                   # Test utilities & setup
├── drizzle.config.ts           # Drizzle ORM configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies & scripts
├── vitest.config.ts            # Vitest configuration
└── README.md                   # This file
```

## Key Integrations

### LegiSync (LegiScan)
- **Purpose**: Sync bill metadata, vote records, and legislator data
- **Trigger**: Cron job via `/api/cron/sync-legiscan`
- **Data**: Bills, votes, legislators, sessions

### AI Bill Summaries (Anthropic Claude)
- **Purpose**: Generate plain-English summaries of complex legislation
- **Trigger**: Cron job via `/api/cron/generate-summaries`
- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

### Representation Scoring
- **Purpose**: Calculate how well legislators represent constituent views
- **Formula**: Compares legislator votes with user sentiments in their district
- **Trigger**: Cron job via `/api/cron/update-scores`

### Stripe Subscriptions
- **Purpose**: Handle premium tier payments
- **Routes**: `/api/stripe/checkout`, `/api/stripe/webhook`
- **Webhook Events**: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`

### Cron Jobs
All cron endpoints are protected by `CRON_SECRET`. Configure these in your hosting platform (Vercel, etc.):

| Endpoint | Recommended Schedule | Purpose |
|----------|----------------------|---------|
| `/api/cron/sync-legiscan` | Every 6 hours | Sync fresh data from LegiScan |
| `/api/cron/generate-summaries` | Every 2 hours | Generate missing AI summaries |
| `/api/cron/update-scores` | Daily | Recalculate representation scores |

Example curl to trigger manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/sync-legiscan
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Run linting: `npm run lint`
6. Commit with clear messages
7. Push and open a pull request

## License

[MIT](LICENSE)
