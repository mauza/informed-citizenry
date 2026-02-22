import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-16 space-y-6">
        <Badge variant="secondary" className="text-sm">
          Civic Engagement Platform
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Does your representative
          <br />
          <span className="text-primary">actually represent you?</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Track legislation, voice your opinion on every bill, and see how closely your
          elected officials vote in alignment with their constituents.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/bills">Browse Bills</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/legislators">Find Your Representatives</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI-Powered Summaries</CardTitle>
            <CardDescription>
              Complex legislation translated into plain English so you can make informed decisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">🤖</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Your Opinion</CardTitle>
            <CardDescription>
              Support or oppose every bill with a single tap. Your vote helps measure constituent sentiment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">🗳️</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Representation Score</CardTitle>
            <CardDescription>
              Premium feature: see exactly how often your legislator votes in line with constituents like you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">📊</div>
          </CardContent>
        </Card>
      </section>

      {/* Premium CTA */}
      <section className="bg-muted rounded-2xl p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">Unlock the Representation Score</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Upgrade to Premium to see the proprietary Representation Score — a data-driven
          index that measures how closely each legislator votes with their district.
        </p>
        <Button size="lg" asChild>
          <Link href="/settings">Get Premium</Link>
        </Button>
      </section>
    </div>
  );
}
