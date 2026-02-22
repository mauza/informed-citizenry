import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { legislators } from "@/db/schema";
import { updateRepresentationScore } from "@/lib/representation-score";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allLegislators = await db
    .select({ id: legislators.id })
    .from(legislators)
    .where(eq(legislators.isActive, true));

  let updated = 0;
  const errors: string[] = [];

  for (const leg of allLegislators) {
    try {
      await updateRepresentationScore(leg.id);
      updated++;
    } catch (e) {
      errors.push(`${leg.id}: ${String(e)}`);
    }
  }

  return NextResponse.json({ updated, errors });
}
