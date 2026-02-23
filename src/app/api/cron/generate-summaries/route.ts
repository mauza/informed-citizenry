import { NextRequest, NextResponse } from "next/server";
import { generateBillSummary } from "@/lib/ai-summary";
import { getBillsWithoutSummary } from "@/lib/queries";

// Force this route to be dynamic and not statically generated
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billsToProcess = await getBillsWithoutSummary(20);
  let generated = 0;
  const errors: string[] = [];

  for (const bill of billsToProcess) {
    try {
      await generateBillSummary({ billId: bill.id, title: bill.title, description: bill.description });
      generated++;
    } catch (e) {
      errors.push(`${bill.id}: ${String(e)}`);
    }
  }

  return NextResponse.json({ generated, errors });
}
