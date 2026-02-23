import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills, legislators, states, billVotes } from "@/db/schema";
import { getMasterList, getSessionList, getBill, getRollCall, mapLegiscanStatus } from "@/lib/legiscan";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Force this route to be dynamic and not statically generated
export const dynamic = "force-dynamic";

function authCheck(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const STATE_ABBRS = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA", "NC", "MI"];

export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const stateAbbr of STATE_ABBRS) {
    try {
      const sessions = await getSessionList(stateAbbr);
      const currentSession = sessions.find((s) => !s.prior && !s.sine_die) ?? sessions[0];
      if (!currentSession) continue;

      const masterList = await getMasterList(currentSession.session_id);

      for (const meta of masterList.slice(0, 100)) {
        try {
          const [existing] = await db
            .select({ id: bills.id, changeHash: bills.legiscanChangeHash })
            .from(bills)
            .where(eq(bills.legiscanId, meta.bill_id))
            .limit(1);

          if (existing?.changeHash === meta.change_hash) continue;

          const billData = await getBill(meta.bill_id);

          // Ensure state exists
          await db
            .insert(states)
            .values({ id: stateAbbr, name: stateAbbr, legiscanId: billData.state_id })
            .onConflictDoNothing();

          const billId = existing?.id ?? randomUUID();
          await db
            .insert(bills)
            .values({
              id: billId,
              legiscanId: billData.bill_id,
              legiscanChangeHash: billData.change_hash,
              billType: billData.bill_type || "HB",
              billNumber: billData.bill_number,
              title: billData.title,
              description: billData.description || null,
              status: mapLegiscanStatus(billData.status),
              stateId: stateAbbr,
              sessionYear: billData.session.year_start,
              fullTextUrl: billData.texts?.[0]?.url ?? null,
              lastActionDate: billData.history?.[0]
                ? new Date(billData.history[0].date)
                : null,
              lastActionDescription: billData.history?.[0]?.action ?? null,
            })
            .onConflictDoUpdate({
              target: bills.id,
              set: {
                legiscanChangeHash: billData.change_hash,
                title: billData.title,
                status: mapLegiscanStatus(billData.status),
                lastActionDate: billData.history?.[0] ? new Date(billData.history[0].date) : null,
                lastActionDescription: billData.history?.[0]?.action ?? null,
                updatedAt: new Date(),
              },
            });

          // Sync votes
          for (const voteRef of (billData.votes ?? []).slice(0, 5)) {
            try {
              const rollCall = await getRollCall(voteRef.roll_call_id);
              for (const v of rollCall.votes) {
                const voteText = v.vote_text.toLowerCase();
                const vote = voteText.includes("yea") || voteText === "yes"
                  ? "yea"
                  : voteText.includes("nay") || voteText === "no"
                  ? "nay"
                  : voteText.includes("absent")
                  ? "absent"
                  : "present";

                const [leg] = await db
                  .select({ id: legislators.id })
                  .from(legislators)
                  .where(eq(legislators.legiscanId, v.people_id))
                  .limit(1);

                if (!leg) continue;

                await db
                  .insert(billVotes)
                  .values({
                    id: randomUUID(),
                    billId,
                    legislatorId: leg.id,
                    vote,
                    voteDate: new Date(rollCall.date),
                  })
                  .onConflictDoNothing();
              }
            } catch {}
          }

          synced++;
        } catch (e) {
          errors.push(`bill ${meta.bill_id}: ${String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`state ${stateAbbr}: ${String(e)}`);
    }
  }

  return NextResponse.json({ synced, errors: errors.slice(0, 10) });
}
