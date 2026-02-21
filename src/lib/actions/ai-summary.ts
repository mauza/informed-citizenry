"use server";

import { generateBillSummary } from "@/lib/ai-summary";
import { db } from "@/db";
import { billSummaries, bills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  billId: z.string().uuid("Invalid bill ID"),
});

export async function requestBillSummary(billId: string) {
  // Validate input
  const parsed = schema.safeParse({ billId });
  if (!parsed.success) {
    return { error: "Invalid bill ID format." };
  }

  // Rate limiting: max 10 AI requests per minute per IP
  const rateLimit = await checkRateLimit(`ai_summary:${billId}`, {
    maxRequests: 10,
    windowMs: 60000,
  });
  
  if (!rateLimit.success) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  // Check if summary already exists
  const [existing] = await db
    .select({ summary: billSummaries.summary })
    .from(billSummaries)
    .where(eq(billSummaries.billId, billId))
    .limit(1);

  if (existing) return { summary: existing.summary };

  // Fetch bill
  const [bill] = await db
    .select({ title: bills.title, description: bills.description })
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);

  if (!bill) return { error: "Bill not found" };

  try {
    const summary = await generateBillSummary({
      billId,
      title: bill.title,
      description: bill.description,
    });
    revalidatePath(`/bills/${billId}`);
    return { summary };
  } catch (e) {
    console.error("AI summary error:", e);
    return { error: "Failed to generate summary." };
  }
}
