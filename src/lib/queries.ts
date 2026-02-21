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
  const conditions = [];
  if (stateId) conditions.push(eq(bills.stateId, stateId));
  if (status && status !== "all") conditions.push(eq(bills.status, status));
  if (search) conditions.push(ilike(bills.title, `%${search}%`));

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
    .limit(limit)
    .offset(page * limit);

  return rows;
}

export async function getBillById(id: string, userId?: string) {
  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, id))
    .limit(1);

  if (!bill) return null;

  const [summary] = await db
    .select({ summary: billSummaries.summary })
    .from(billSummaries)
    .where(eq(billSummaries.billId, id))
    .limit(1);

  const sentimentCounts = await db
    .select({
      sentiment: userBillSentiments.sentiment,
      total: count(),
    })
    .from(userBillSentiments)
    .where(eq(userBillSentiments.billId, id))
    .groupBy(userBillSentiments.sentiment);

  let userSentiment: string | null = null;
  if (userId) {
    const [ubs] = await db
      .select({ sentiment: userBillSentiments.sentiment })
      .from(userBillSentiments)
      .where(and(eq(userBillSentiments.userId, userId), eq(userBillSentiments.billId, id)))
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
    .where(eq(billVotes.billId, id));

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
  const conditions = [eq(legislators.isActive, true)];
  if (stateId) conditions.push(eq(legislators.stateId, stateId));
  if (chamber) conditions.push(eq(legislators.chamber, chamber));
  if (search) {
    conditions.push(
      or(
        ilike(legislators.firstName, `%${search}%`),
        ilike(legislators.lastName, `%${search}%`)
      )!
    );
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
    .limit(limit)
    .offset(page * limit);

  return rows;
}

export async function getLegislatorById(id: string) {
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
    .where(eq(legislators.id, id))
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
    .where(eq(billVotes.legislatorId, id))
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
    .where(eq(bills.primarySponsorId, id))
    .orderBy(desc(bills.updatedAt))
    .limit(10);

  return { ...legislator, recentVotes, sponsoredBills };
}

export async function getUserSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub) return false;
  if (sub.tier !== "premium") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}

export async function getUserVotes(userId: string) {
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
    .where(eq(userBillSentiments.userId, userId))
    .orderBy(desc(userBillSentiments.updatedAt));

  return rows;
}

export async function getStates() {
  return db.select().from(states).orderBy(states.name);
}

export async function getBillsWithoutSummary(limit = 50) {
  const withSummary = db.select({ billId: billSummaries.billId }).from(billSummaries);
  return db
    .select({ id: bills.id, title: bills.title, description: bills.description })
    .from(bills)
    .where(sql`${bills.id} NOT IN (${withSummary})`)
    .limit(limit);
}
