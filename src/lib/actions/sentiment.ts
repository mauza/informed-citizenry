"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { userBillSentiments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  billId: z.string().uuid("Invalid bill ID"),
  sentiment: z.enum(["support", "oppose"]),
});

export async function submitSentiment(billId: string, sentiment: "support" | "oppose") {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to vote." };
  }

  // Rate limiting: max 30 votes per minute per user
  const rateLimit = await checkRateLimit(`sentiment:${session.user.id}`, {
    maxRequests: 30,
    windowMs: 60000,
  });
  
  if (!rateLimit.success) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  const parsed = schema.safeParse({ billId, sentiment });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const userId = session.user.id;

  await db
    .insert(userBillSentiments)
    .values({
      id: randomUUID(),
      userId,
      billId,
      sentiment,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userBillSentiments.userId, userBillSentiments.billId],
      set: { sentiment, updatedAt: new Date() },
    });

  revalidatePath(`/bills/${billId}`);
  return { success: true };
}

const removeSchema = z.object({
  billId: z.string().uuid("Invalid bill ID"),
});

export async function removeSentiment(billId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  // Rate limiting: max 30 removals per minute per user
  const rateLimit = await checkRateLimit(`sentiment_remove:${session.user.id}`, {
    maxRequests: 30,
    windowMs: 60000,
  });
  
  if (!rateLimit.success) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  const parsed = removeSchema.safeParse({ billId });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  await db
    .delete(userBillSentiments)
    .where(
      and(
        eq(userBillSentiments.userId, session.user.id),
        eq(userBillSentiments.billId, billId)
      )
    );

  revalidatePath(`/bills/${billId}`);
  return { success: true };
}
