import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { billSummaries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generateBillSummary({
  billId,
  title,
  description,
}: {
  billId: string;
  title: string;
  description: string | null;
}): Promise<string> {
  const content = description
    ? `Title: ${title}\n\nDescription: ${description}`
    : `Title: ${title}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Summarize the following bill in 2-3 plain-English sentences for a general audience. Focus on what the bill would do and who it affects. Be neutral and factual.\n\n${content}`,
      },
    ],
  });

  const summary = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  await db
    .insert(billSummaries)
    .values({
      id: randomUUID(),
      billId,
      summary,
      modelVersion: "claude-haiku-4-5-20251001",
    })
    .onConflictDoUpdate({
      target: billSummaries.billId,
      set: { summary, generatedAt: new Date(), modelVersion: "claude-haiku-4-5-20251001" },
    });

  return summary;
}
