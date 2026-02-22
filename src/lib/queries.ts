import { db } from "@/db";
import {
  bills,
  billSummaries,
  billVotes,
  legislators,
  representationScores,
  states,
  userBillSentiments,
  userSubscriptions,
} from "@/db/schema";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

// Validate UUID format
const uuidSchema = z.string().uuid();

// Validate and sanitize search input
function sanitizeSearchInput(input: string): string {
  // Remove any SQL special characters that could cause issues
  // Even though Drizzle uses parameterized queries, this adds defense in depth
  return input
    .replace(/[%_]/g, "\\$&") // Escape SQL LIKE special characters
    .replace(/[<>]/g, ""); // Remove potential HTML/JS injection characters
}

// Validate state ID (2-letter abbreviation)
const stateIdSchema = z.string().length(2).regex(/^[A-Z]{2}$/);

const VALID_STATUSES = ["introduced", "in_committee", "passed", "signed", "vetoed", "failed"];

export async function getBills({
  stateId,
  status,
  search,
  page = 0,
  limit = 20,
}: {
  stateId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  // Validate inputs
  const validatedLimit = Math.min(Math.max(limit, 1), 100); // Limit between 1-100
  const validatedPage = Math.max(page, 0);
  
  const conditions = [];
  
  // Validate stateId format (2-letter uppercase)
  if (stateId) {
    const stateResult = stateIdSchema.safeParse(stateId.toUpperCase());
    if (stateResult.success) {
      conditions.push(eq(bills.stateId, stateResult.data));
    }
  }
  
  // Validate status against whitelist
  if (status && status !== "all" && VALID_STATUSES.includes(status)) {
    conditions.push(eq(bills.status, status));
  }
  
  // Sanitize and validate search input
  if (search && search.trim().length > 0 && search.length <= 200) {
    const sanitized = sanitizeSearchInput(search.trim());
    if (sanitized.length > 0) {
      conditions.push(ilike(bills.title, `%${sanitized}%`));
    }
  }

  const rows = await db
    .select({
      id: bills.id,
      billType: bills.billType,
      billNumber: bills.billNumber,
      title: bills.title,
      status: bills.status,
      stateId: bills.stateId,
      sessionYear: bills.sessionYear,
      lastActionDate: bills.lastActionDate,
      lastActionDescription: bills.lastActionDescription,
    })
    .from(bills)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bills.updatedAt))
    .limit(validatedLimit)
    .offset(validatedPage * validatedLimit);

  return rows;
}

export async function getBillById(id: string, userId?: string) {
  // Validate UUID format
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) {
    return null;
  }

  // Validate userId if provided
  let validatedUserId: string | undefined;
  if (userId) {
    const userResult = uuidSchema.safeParse(userId);
    if (userResult.success) {
      validatedUserId = userResult.data;
    }
  }

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, idResult.data))
    .limit(1);

  if (!bill) return null;

  const [summary] = await db
    .select({ summary: billSummaries.summary })
    .from(billSummaries)
    .where(eq(billSummaries.billId, idResult.data))
    .limit(1);

  const sentimentCounts = await db
    .select({
      sentiment: userBillSentiments.sentiment,
      total: count(),
    })
    .from(userBillSentiments)
    .where(eq(userBillSentiments.billId, idResult.data))
    .groupBy(userBillSentiments.sentiment);

  let userSentiment: string | null = null;
  if (validatedUserId) {
    const [ubs] = await db
      .select({ sentiment: userBillSentiments.sentiment })
      .from(userBillSentiments)
      .where(and(eq(userBillSentiments.userId, validatedUserId), eq(userBillSentiments.billId, idResult.data)))
      .limit(1);
    userSentiment = ubs?.sentiment ?? null;
  }

  const votes = await db
    .select({
      id: billVotes.id,
      legislatorId: billVotes.legislatorId,
      firstName: legislators.firstName,
      lastName: legislators.lastName,
      party: legislators.party,
      chamber: legislators.chamber,
      vote: billVotes.vote,
    })
    .from(billVotes)
    .innerJoin(legislators, eq(billVotes.legislatorId, legislators.id))
    .where(eq(billVotes.billId, idResult.data));

  const supportCount = sentimentCounts.find((s) => s.sentiment === "support")?.total ?? 0;
  const opposeCount = sentimentCounts.find((s) => s.sentiment === "oppose")?.total ?? 0;

  return {
    ...bill,
    aiSummary: summary?.summary ?? null,
    supportCount: Number(supportCount),
    opposeCount: Number(opposeCount),
    userSentiment,
    votes,
  };
}

const VALID_CHAMBERS = ["H", "S"]; // House, Senate

export async function getLegislators({
  stateId,
  chamber,
  search,
  page = 0,
  limit = 20,
}: {
  stateId?: string;
  chamber?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  // Validate inputs
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const validatedPage = Math.max(page, 0);
  
  const conditions = [eq(legislators.isActive, true)];
  
  // Validate stateId format (2-letter uppercase)
  if (stateId) {
    const stateResult = stateIdSchema.safeParse(stateId.toUpperCase());
    if (stateResult.success) {
      conditions.push(eq(legislators.stateId, stateResult.data));
    }
  }
  
  // Validate chamber against whitelist
  if (chamber && VALID_CHAMBERS.includes(chamber.toUpperCase())) {
    conditions.push(eq(legislators.chamber, chamber.toUpperCase()));
  }
  
  // Sanitize and validate search input
  if (search && search.trim().length > 0 && search.length <= 200) {
    const sanitized = sanitizeSearchInput(search.trim());
    if (sanitized.length > 0) {
      conditions.push(
        or(
          ilike(legislators.firstName, `%${sanitized}%`),
          ilike(legislators.lastName, `%${sanitized}%`)
        )!
      );
    }
  }

  const rows = await db
    .select({
      id: legislators.id,
      firstName: legislators.firstName,
      lastName: legislators.lastName,
      party: legislators.party,
      chamber: legislators.chamber,
      stateId: legislators.stateId,
      role: legislators.role,
      photoUrl: legislators.photoUrl,
      score: representationScores.score,
      billsAnalyzed: representationScores.billsAnalyzed,
    })
    .from(legislators)
    .leftJoin(representationScores, eq(legislators.id, representationScores.legislatorId))
    .where(and(...conditions))
    .orderBy(legislators.lastName, legislators.firstName)
    .limit(validatedLimit)
    .offset(validatedPage * validatedLimit);

  return rows;
}

export async function getLegislatorById(id: string) {
  // Validate UUID format
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) {
    return null;
  }

  const [legislator] = await db
    .select({
      id: legislators.id,
      firstName: legislators.firstName,
      lastName: legislators.lastName,
      party: legislators.party,
      chamber: legislators.chamber,
      stateId: legislators.stateId,
      districtId: legislators.districtId,
      role: legislators.role,
      email: legislators.email,
      phone: legislators.phone,
      website: legislators.website,
      twitterHandle: legislators.twitterHandle,
      photoUrl: legislators.photoUrl,
      score: representationScores.score,
      billsAnalyzed: representationScores.billsAnalyzed,
    })
    .from(legislators)
    .leftJoin(representationScores, eq(legislators.id, representationScores.legislatorId))
    .where(eq(legislators.id, idResult.data))
    .limit(1);

  if (!legislator) return null;

  const recentVotes = await db
    .select({
      id: billVotes.id,
      billId: billVotes.billId,
      billType: bills.billType,
      billNumber: bills.billNumber,
      title: bills.title,
      vote: billVotes.vote,
      voteDate: billVotes.voteDate,
    })
    .from(billVotes)
    .innerJoin(bills, eq(billVotes.billId, bills.id))
    .where(eq(billVotes.legislatorId, idResult.data))
    .orderBy(desc(billVotes.voteDate))
    .limit(20);

  const sponsoredBills = await db
    .select({
      id: bills.id,
      billType: bills.billType,
      billNumber: bills.billNumber,
      title: bills.title,
      status: bills.status,
    })
    .from(bills)
    .where(eq(bills.primarySponsorId, idResult.data))
    .orderBy(desc(bills.updatedAt))
    .limit(10);

  return { ...legislator, recentVotes, sponsoredBills };
}

export async function getUserSubscription(userId: string) {
  // Validate UUID format
  const idResult = uuidSchema.safeParse(userId);
  if (!idResult.success) {
    return null;
  }

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, idResult.data))
    .limit(1);
  return sub ?? null;
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  // Validate UUID format
  const idResult = uuidSchema.safeParse(userId);
  if (!idResult.success) {
    return false;
  }

  const sub = await getUserSubscription(idResult.data);
  if (!sub) return false;
  if (sub.tier !== "premium") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}

export async function getUserVotes(userId: string) {
  // Validate UUID format
  const idResult = uuidSchema.safeParse(userId);
  if (!idResult.success) {
    return [];
  }

  const rows = await db
    .select({
      id: userBillSentiments.id,
      billId: userBillSentiments.billId,
      billType: bills.billType,
      billNumber: bills.billNumber,
      title: bills.title,
      status: bills.status,
      sentiment: userBillSentiments.sentiment,
      createdAt: userBillSentiments.createdAt,
    })
    .from(userBillSentiments)
    .innerJoin(bills, eq(userBillSentiments.billId, bills.id))
    .where(eq(userBillSentiments.userId, idResult.data))
    .orderBy(desc(userBillSentiments.updatedAt));

  return rows;
}

export async function getStates() {
  return db.select().from(states).orderBy(states.name);
}

export async function getBillsWithoutSummary(limit = 50) {
  // Validate limit
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  
  const withSummary = db.select({ billId: billSummaries.billId }).from(billSummaries);
  return db
    .select({ id: bills.id, title: bills.title, description: bills.description })
    .from(bills)
    .where(sql`${bills.id} NOT IN (${withSummary})`)
    .limit(validatedLimit);
}
