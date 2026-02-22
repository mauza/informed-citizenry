import { notFound } from "next/navigation";
import { getLegislatorById, isPremiumUser } from "@/lib/queries";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumGate } from "@/components/premium-gate";
import Link from "next/link";
import { ExternalLink, Mail, Phone, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  introduced: "Introduced",
  in_committee: "In Committee",
  passed: "Passed",
  signed: "Signed",
  vetoed: "Vetoed",
  failed: "Failed",
};

export default async function LegislatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const legislator = await getLegislatorById(id);

  if (!legislator) notFound();

  const isPremium = session?.user?.id ? await isPremiumUser(session.user.id) : false;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={legislator.photoUrl ?? undefined} />
          <AvatarFallback className="text-xl">
            {legislator.firstName.charAt(0)}{legislator.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {legislator.firstName} {legislator.lastName}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {legislator.party && (
              <Badge variant="outline">
                {legislator.party === "D" ? "Democrat" : legislator.party === "R" ? "Republican" : legislator.party}
              </Badge>
            )}
            <Badge>{legislator.chamber === "H" ? "House" : "Senate"}</Badge>
            <span className="text-muted-foreground text-sm">{legislator.stateId}</span>
          </div>
          {legislator.role && (
            <p className="text-muted-foreground text-sm">{legislator.role}</p>
          )}
        </div>
      </div>

      {/* Contact */}
      {(legislator.email || legislator.phone || legislator.website || legislator.twitterHandle) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {legislator.email && (
              <a href={`mailto:${legislator.email}`} className="flex items-center gap-2 text-sm hover:underline">
                <Mail className="h-4 w-4" /> {legislator.email}
              </a>
            )}
            {legislator.phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" /> {legislator.phone}
              </p>
            )}
            {legislator.website && (
              <a href={legislator.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <ExternalLink className="h-4 w-4" /> Official Website
              </a>
            )}
            {legislator.twitterHandle && (
              <a href={`https://twitter.com/${legislator.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <Twitter className="h-4 w-4" /> @{legislator.twitterHandle}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Representation Score */}
      <PremiumGate isPremium={isPremium}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Representation Score</CardTitle>
          </CardHeader>
          <CardContent>
            {legislator.score !== null ? (
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  {Number(legislator.score).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {legislator.billsAnalyzed} qualifying bills where constituent sentiment
                  matched the legislator&apos;s vote.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough data yet. At least 5 constituent votes per bill are needed.
              </p>
            )}
          </CardContent>
        </Card>
      </PremiumGate>

      {/* Recent Votes */}
      {legislator.recentVotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {legislator.recentVotes.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <Link href={`/bills/${v.billId}`} className="hover:underline line-clamp-1 flex-1 pr-4">
                    {v.billType} {v.billNumber}: {v.title}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={v.vote === "yea" ? "default" : v.vote === "nay" ? "destructive" : "secondary"}
                    >
                      {v.vote.toUpperCase()}
                    </Badge>
                    {v.voteDate && (
                      <span className="text-muted-foreground text-xs hidden sm:block">
                        {new Date(v.voteDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsored Bills */}
      {legislator.sponsoredBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sponsored Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {legislator.sponsoredBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <Link href={`/bills/${b.id}`} className="hover:underline line-clamp-1 flex-1 pr-4">
                    {b.billType} {b.billNumber}: {b.title}
                  </Link>
                  <Badge variant="outline" className="shrink-0">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
