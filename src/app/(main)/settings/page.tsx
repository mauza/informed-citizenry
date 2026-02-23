import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile as updateProfileAction } from "@/lib/actions/profile";
import { UpgradeButton } from "@/components/upgrade-button";
import { db } from "@/db";

async function updateProfile(formData: FormData): Promise<void> {
  "use server";
  await updateProfileAction(formData);
}
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const [userRecord, subscription] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.user.id)).limit(1).then(([u]) => u),
    getUserSubscription(session.user.id),
  ]);

  const isPremium =
    subscription?.tier === "premium" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date());

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and subscription.</p>
      </div>

      {params.upgraded && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-3 text-sm">
          Welcome to Premium! Your Representation Score access is now active.
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your name and address for local representative lookup.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" defaultValue={userRecord?.name ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Home address</Label>
              <Input
                id="address"
                name="address"
                placeholder="123 Main St, City, State ZIP"
                defaultValue={userRecord?.address ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Used to identify your district and local representatives.
              </p>
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Upgrade to Premium to unlock the Representation Score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={isPremium ? "default" : "secondary"}>
              {isPremium ? "Premium" : "Free"}
            </Badge>
            {isPremium && subscription?.currentPeriodEnd && (
              <span className="text-sm text-muted-foreground">
                Active until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
          {!isPremium && (
            <div className="space-y-3">
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ AI-powered bill summaries (free)</li>
                <li>✓ Support/Oppose on all bills (free)</li>
                <li>✓ Legislator directory (free)</li>
                <li className="text-foreground font-medium">🔒 Representation Score (Premium)</li>
              </ul>
              <UpgradeButton />
            </div>
          )}
          {isPremium && subscription?.stripeCustomerId && (
            <ManageBillingButton customerId={subscription.stripeCustomerId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ManageBillingButton({ customerId }: { customerId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { getStripe } = await import("@/lib/stripe");
        const { redirect } = await import("next/navigation");
        const stripe = getStripe();
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        });
        redirect(session.url);
      }}
    >
      <Button variant="outline" type="submit">
        Manage Billing
      </Button>
    </form>
  );
}
