# Architecture

This document provides a high-level overview of the Informed Citizenry system architecture.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | React framework with SSR/SSG |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **UI Components** | Radix UI + shadcn/ui | Accessible, composable components |
| **Authentication** | NextAuth.js v5 | OAuth (GitHub) + Magic Links (Resend) |
| **Database** | Neon PostgreSQL | Serverless Postgres |
| **ORM** | Drizzle ORM | Type-safe SQL queries |
| **AI** | Anthropic Claude | Bill summarization |
| **Payments** | Stripe | Subscription management |
| **Email** | Resend | Transactional emails |
| **External Data** | LegiScan API | Bill and voting data |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth.js handlers
│   │   ├── cron/           # Scheduled job endpoints
│   │   │   ├── sync-legiscan/      # Sync bills from LegiScan
│   │   │   ├── generate-summaries/ # Generate AI summaries
│   │   │   └── update-scores/      # Update representation scores
│   │   └── stripe/         # Stripe checkout & webhooks
│   └── (main)/             # Main app pages (authenticated)
│       ├── dashboard/      # Authenticated user dashboard
│       ├── bills/          # Bill listings & details
│       ├── legislators/    # Legislator listings & profiles
│       ├── my-votes/       # User's recorded sentiments
│       ├── settings/       # User settings
│       └── login/          # Authentication page
├── auth/                   # NextAuth.js configuration
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── bills/              # Bill-related components
│   └── legislators/        # Legislator-related components
├── db/                     # Database configuration
│   ├── index.ts            # Database connection (Neon)
│   └── schema.ts           # Drizzle schema definitions
└── lib/                    # Utility functions & business logic
    ├── actions/            # Server actions
    ├── legiscan.ts         # LegiScan API integration
    ├── ai-summary.ts       # Anthropic Claude integration
    ├── stripe.ts           # Stripe client & config
    ├── queries.ts          # Database queries
    └── representation-score.ts  # Score calculation logic
```

## Data Flow

### User Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  NextAuth.js │────▶│   Neon DB   │
│  (Browser)  │◀────│   (OAuth)    │◀────│  (Session)  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ GitHub/Resend│
                     │  (Providers) │
                     └──────────────┘
```

1. User clicks "Sign In" → GitHub OAuth or Resend magic link
2. NextAuth validates with provider
3. User record created/updated in Neon database
4. Session stored in database (strategy: "database")
5. Session token returned to browser

### Bill Data Sync Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cron Job  │────▶│  LegiScan    │────▶│   Neon DB   │
│  (Vercel)   │     │    API       │     │ (bills,     │
└─────────────┘     └──────────────┘     │ legislators,│
                                         │   votes)    │
                                         └─────────────┘
```

**Schedule**: Every 6 hours via `/api/cron/sync-legiscan`

1. Fetch states, sessions, and active bills from LegiScan
2. Upsert legislators and their details
3. Upsert bills with metadata
4. Sync voting records and bill statuses

### AI Summary Generation Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cron Job  │────▶│  Neon DB     │────▶│  Anthropic  │
│  (Vercel)   │     │(bills needing│     │   Claude    │
└─────────────┘     │  summary)    │     └──────┬──────┘
                    └──────────────┘            │
                           │                    ▼
                           │             ┌──────────────┐
                           │◀────────────│ AI Summary   │
                           │             │  (Plain Eng) │
                           ▼             └──────────────┘
                    ┌──────────────┐
                    │ Neon DB      │
                    │(bill_summaries│
                    │    table)     │
                    └──────────────┘
```

**Schedule**: Every 2 hours via `/api/cron/generate-summaries`

1. Query bills without summaries
2. Fetch full bill text from LegiScan
3. Send to Claude Haiku 4.5 for summarization
4. Store generated summary in database

### Representation Scoring Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cron Job  │────▶│  Neon DB     │────▶│  Score      │
│  (Vercel)   │     │(votes +      │     │ Calculation │
└─────────────┘     │ sentiments)  │     └──────┬──────┘
                    └──────────────┘            │
                                                ▼
                                         ┌──────────────┐
                                         │ Compare votes│
                                         │  vs. public  │
                                         │  sentiment   │
                                         └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ Neon DB      │
                                         │(representation│
                                         │   scores)    │
                                         └──────────────┘
```

**Schedule**: Daily via `/api/cron/update-scores`

1. For each legislator, fetch their voting record
2. Fetch user sentiments (support/oppose) for those bills
3. Calculate alignment: how often votes match constituent views
4. Store score (0-100) in representation_scores table

### User Sentiment Recording Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  Server      │────▶│   Neon DB   │
│  (Clicks    │     │  Action      │     │(user_bill_  │
│ Support/    │     │(sentiment.ts)│     │ sentiments) │
│  Oppose)    │     └──────────────┘     └─────────────┘
└─────────────┘
```

1. Authenticated user clicks support/oppose on a bill
2. Server action validates and records sentiment
3. Duplicate votes are prevented (unique constraint)
4. Score recalculation triggered asynchronously

### Premium Subscription Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  Stripe      │────▶│   Stripe    │
│(Clicks      │     │  Checkout    │     │   Hosted    │
│  Upgrade)   │     │   API        │     │   Page      │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌───────────────────────────┘
                    ▼
            ┌──────────────┐
            │ User pays    │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐     ┌─────────────┐
            │ Stripe       │────▶│   Neon DB   │
            │ Webhook      │     │(user_subs)  │
            └──────────────┘     └─────────────┘
```

1. User clicks upgrade → redirected to Stripe Checkout
2. After payment, Stripe redirects to success page
3. Webhook updates subscription status in database
4. Premium features unlocked immediately

## Database Schema

The database contains 13 tables organized into four categories:

### Authentication (NextAuth.js)
- `users` - User accounts with profile data
- `accounts` - OAuth provider accounts
- `sessions` - Active sessions
- `verificationTokens` - Email verification tokens

### Geographic Data
- `states` - US states (CA, TX, etc.)
- `districts` - Legislative districts within states

### Legislative Data
- `legislators` - State representatives and senators
- `bills` - Legislation with metadata
- `billVotes` - How legislators voted on bills
- `billSummaries` - AI-generated plain-English summaries

### User Data
- `userBillSentiments` - User support/oppose stances
- `representationScores` - Calculated alignment scores
- `userSubscriptions` - Premium subscription status

See `src/db/schema.ts` for full schema definitions.

## Key Integrations

### LegiScan API
- **Data**: Bills, votes, legislators, sessions
- **Sync**: Cron job every 6 hours
- **Rate Limiting**: Respected with exponential backoff

### Anthropic Claude
- **Model**: claude-haiku-4-5-20251001
- **Use Case**: Bill text summarization
- **Output**: Plain-English summaries stored in bill_summaries table

### Stripe
- **Features**: Subscriptions, checkout, webhooks
- **Events**: checkout.session.completed, invoice.paid, customer.subscription.deleted
- **Security**: Webhook signatures verified

### Resend
- **Use Case**: Magic link authentication emails
- **From**: Configured verified domain

## Security Considerations

- **Authentication**: NextAuth.js with database sessions
- **Authorization**: Cron endpoints protected by CRON_SECRET header
- **SQL Injection**: Prevented by Drizzle ORM parameterized queries
- **XSS**: React's built-in escaping + Next.js security headers
- **CSRF**: NextAuth.js CSRF protection
- **Rate Limiting**: Implemented on sensitive actions (sentiment voting)
- **Environment Variables**: All secrets in `.env.local`, never committed

## Performance Optimizations

- **Database**: Neon serverless Postgres with connection pooling
- **Caching**: Next.js caching for static and dynamic routes
- **AI Summaries**: Generated async via cron jobs, not on-demand
- **Images**: Next.js Image optimization
- **Bundle**: Tree-shaking and code splitting via Next.js

## Deployment

The application is designed to deploy on Vercel:

- **Frontend**: Next.js static/dynamic generation
- **API Routes**: Serverless functions
- **Cron Jobs**: Vercel Cron with CRON_SECRET protection
- **Database**: Neon serverless Postgres (automatic scaling)
- **Environment**: All secrets configured in Vercel dashboard

---

*See [Testing Guide](./testing.md) for information on testing this architecture.*
