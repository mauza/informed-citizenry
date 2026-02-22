import { db } from "@/db";
import {
  billVotes,
  representationScores,
  userBillSentiments,
} from "@/db/schema";
import { and, count, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const MIN_CONSTITUENT_VOTES = 5;

export async function calculateRepresentationScore(legislatorId: string): Promise<{
  score: number;
  billsAnalyzed: number;
}> {
  // Get all bills where this legislator voted
  const legislatorVotes = await db
    .select({ billId: billVotes.billId, vote: billVotes.vote })
    .from(billVotes)
    .where(and(eq(billVotes.legislatorId, legislatorId)));

  if (legislatorVotes.length === 0) {
    return { score: 0, billsAnalyzed: 0 };
  }

  const billIds = legislatorVotes.map((v) => v.billId);

  // For each bill, get constituent sentiment aggregates
  const sentimentAggs = await db
    .select({
      billId: userBillSentiments.billId,
      sentiment: userBillSentiments.sentiment,
      total: count(),
    })
    .from(userBillSentiments)
    .where(sql`${userBillSentiments.billId} = ANY(${billIds})`)
    .groupBy(userBillSentiments.billId, userBillSentiments.sentiment);

  // Group by bill
  const billSentimentMap = new Map<string, { support: number; oppose: number }>();
  for (const row of sentimentAggs) {
    const existing = billSentimentMap.get(row.billId) ?? { support: 0, oppose: 0 };
    if (row.sentiment === "support") existing.support = Number(row.total);
    if (row.sentiment === "oppose") existing.oppose = Number(row.total);
    billSentimentMap.set(row.billId, existing);
  }

  let matchingBills = 0;
  let qualifyingBills = 0;

  for (const lv of legislatorVotes) {
    const sentiment = billSentimentMap.get(lv.billId);
    if (!sentiment) continue;

    const total = sentiment.support + sentiment.oppose;
    if (total < MIN_CONSTITUENT_VOTES) continue;

    qualifyingBills++;

    const constituentMajority = sentiment.support >= sentiment.oppose ? "support" : "oppose";
    const legislatorAlignment =
      lv.vote === "yea" ? "support" : lv.vote === "nay" ? "oppose" : null;

    if (legislatorAlignment === constituentMajority) {
      matchingBills++;
    }
  }

  const score = qualifyingBills > 0 ? (matchingBills / qualifyingBills) * 100 : 0;
  return { score: Math.round(score * 100) / 100, billsAnalyzed: qualifyingBills };
}

export async function updateRepresentationScore(legislatorId: string) {
  const { score, billsAnalyzed } = await calculateRepresentationScore(legislatorId);

  await db
    .insert(representationScores)
    .values({
      id: randomUUID(),
      legislatorId,
      score: String(score),
      billsAnalyzed,
      lastCalculated: new Date(),
    })
    .onConflictDoUpdate({
      target: representationScores.legislatorId,
      set: { score: String(score), billsAnalyzed, lastCalculated: new Date() },
    });
}
