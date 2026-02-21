import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserSubscription, getLegislators, getStates } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const subscription = await getUserSubscription(session.user.id);
  const isPremium =
    subscription?.tier === "premium" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name ?? "Citizen"}!</p>
      </div>

      {/* Subscription status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isPremium ? "default" : "secondary"}>
              {isPremium ? "Premium" : "Free"}
            </Badge>
            {isPremium && subscription?.currentPeriodEnd && (
              <span className="text-sm text-muted-foreground">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
          {!isPremium && (
            <Button size="sm" asChild>
              <Link href="/settings">Upgrade</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Browse Bills</CardTitle>
            <CardDescription>Track legislation in your state</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/bills">View Bills</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Votes</CardTitle>
            <CardDescription>See bills you&apos;ve supported or opposed</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/my-votes">View My Votes</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Representatives</CardTitle>
            <CardDescription>Find your elected officials</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/legislators">Browse Legislators</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
