import { pgTable, text, timestamp, integer, numeric, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  address: text("address"),
  stateId: text("state_id"),
  districtId: text("district_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [uniqueIndex("provider_account_idx").on(t.provider, t.providerAccountId)]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("identifier_token_idx").on(t.identifier, t.token)]
);

export const states = pgTable("states", {
  id: text("id").primaryKey(), // e.g., "CA", "TX"
  name: text("name").notNull(),
  legiscanId: integer("legiscan_id"),
});

export const districts = pgTable("districts", {
  id: text("id").primaryKey(),
  stateId: text("state_id").notNull().references(() => states.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'house' | 'senate' | 'congress'
});

export const legislators = pgTable(
  "legislators",
  {
    id: text("id").primaryKey(),
    legiscanId: integer("legiscan_id"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    party: text("party"), // 'D', 'R', 'I', etc.
    chamber: text("chamber").notNull(), // 'H' | 'S'
    stateId: text("state_id").notNull().references(() => states.id),
    districtId: text("district_id").references(() => districts.id),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    twitterHandle: text("twitter_handle"),
    photoUrl: text("photo_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("legislators_state_idx").on(t.stateId)]
);

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(),
    legiscanId: integer("legiscan_id"),
    legiscanChangeHash: text("legiscan_change_hash"),
    billType: text("bill_type").notNull(), // 'HB', 'SB', 'HR', etc.
    billNumber: text("bill_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull(), // 'introduced', 'in_committee', 'passed', 'signed', 'vetoed', 'failed'
    stateId: text("state_id").notNull().references(() => states.id),
    sessionYear: integer("session_year").notNull(),
    primarySponsorId: text("primary_sponsor_id").references(() => legislators.id),
    fullTextUrl: text("full_text_url"),
    lastActionDate: timestamp("last_action_date", { mode: "date" }),
    lastActionDescription: text("last_action_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("bills_state_idx").on(t.stateId),
    index("bills_status_idx").on(t.status),
    index("bills_updated_idx").on(t.updatedAt),
  ]
);

export const billVotes = pgTable(
  "bill_votes",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    legislatorId: text("legislator_id").notNull().references(() => legislators.id, { onDelete: "cascade" }),
    vote: text("vote").notNull(), // 'yea', 'nay', 'absent', 'present'
    voteDate: timestamp("vote_date", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("bill_legislator_vote_idx").on(t.billId, t.legislatorId),
    index("bill_votes_legislator_idx").on(t.legislatorId),
  ]
);

export const billSummaries = pgTable("bill_summaries", {
  id: text("id").primaryKey(),
  billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }).unique(),
  summary: text("summary").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  modelVersion: text("model_version"),
});

export const userBillSentiments = pgTable(
  "user_bill_sentiments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    sentiment: text("sentiment").notNull(), // 'support' | 'oppose'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_bill_sentiment_idx").on(t.userId, t.billId),
    index("sentiments_bill_idx").on(t.billId),
  ]
);

export const representationScores = pgTable("representation_scores", {
  id: text("id").primaryKey(),
  legislatorId: text("legislator_id").notNull().references(() => legislators.id, { onDelete: "cascade" }).unique(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  billsAnalyzed: integer("bills_analyzed").notNull().default(0),
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  tier: text("tier").notNull().default("free"), // 'free' | 'premium'
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
