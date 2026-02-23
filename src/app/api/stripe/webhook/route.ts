import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { userSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type Stripe from "stripe";

// Force this route to be dynamic and not statically generated
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || session.mode !== "subscription") break;

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = subscription.items.data[0]?.current_period_end;

        await db
          .insert(userSubscriptions)
          .values({
            id: randomUUID(),
            userId,
            tier: "premium",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          })
          .onConflictDoUpdate({
            target: userSubscriptions.userId,
            set: {
              tier: "premium",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
              updatedAt: new Date(),
            },
          });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          (invoice as unknown as { parent?: { subscription_details?: { subscription?: string }; }; subscription?: string })
            .parent?.subscription_details?.subscription ??
          (invoice as unknown as { subscription?: string }).subscription ??
          null;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const periodEnd = subscription.items.data[0]?.current_period_end;

        await db
          .update(userSubscriptions)
          .set({
            tier: "premium",
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.userId, userId));
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await db
          .update(userSubscriptions)
          .set({ tier: "free", currentPeriodEnd: null, updatedAt: new Date() })
          .where(eq(userSubscriptions.userId, userId));
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
