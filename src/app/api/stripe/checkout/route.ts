import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutSession, PREMIUM_PRICE_ID } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId: PREMIUM_PRICE_ID,
      successUrl: `${origin}/settings?upgraded=1`,
      cancelUrl: `${origin}/settings`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
