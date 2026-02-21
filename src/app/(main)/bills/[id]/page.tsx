import { notFound } from "next/navigation";
import { getBillById } from "@/lib/queries";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SentimentButtons } from "@/components/bills/sentiment-buttons";
import { AiSummarySection } from "@/components/bills/ai-summary-section";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  introduced: "Introduced",
  in_committee: "In Committee",
  passed: "Passed",
  signed: "Signed",
  vetoed: "Vetoed",
  failed: "Failed",
};

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const bill = await getBillById(id, session?.user?.id);

  if (!bill) notFound();

  const yeas = bill.votes.filter((v) => v.vote === "yea");
  const nays = bill.votes.filter((v) => v.vote === "nay");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">
            {bill.stateId} {bill.billType} {bill.billNumber}
          </span>
          <Badge>{STATUS_LABELS[bill.status] ?? bill.status}</Badge>
          <Badge variant="outline">Session {bill.sessionYear}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{bill.title}</h1>
        {bill.lastActionDescription && (
          <p className="text-sm text-muted-foreground">
            Last action: {bill.lastActionDescription}
            {bill.lastActionDate &&
              ` · ${new Date(bill.lastActionDate).toLocaleDateString()}`}
          </p>
        )}
      </div>

      {/* AI Summary */}
      <AiSummarySection billId={id} initialSummary={bill.aiSummary} />

      {/* Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Opinion</CardTitle>
        </CardHeader>
        <CardContent>
          <SentimentButtons
            billId={id}
            initialSentiment={bill.userSentiment as "support" | "oppose" | null}
            supportCount={bill.supportCount}
            opposeCount={bill.opposeCount}
            isAuthenticated={!!session?.user}
          />
        </CardContent>
      </Card>

      {/* Full text link */}
      {bill.fullTextUrl && (
        <Button variant="outline" asChild>
          <a href={bill.fullTextUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Full Text
          </a>
        </Button>
      )}

      {/* Votes */}
      {bill.votes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Legislative Votes — {yeas.length} Yea / {nays.length} Nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {bill.votes.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <Link
                    href={`/legislators/${v.legislatorId}`}
                    className="hover:underline font-medium"
                  >
                    {v.firstName} {v.lastName}
                    {v.party && (
                      <span className="text-muted-foreground ml-1">({v.party})</span>
                    )}
                  </Link>
                  <Badge
                    variant={
                      v.vote === "yea"
                        ? "default"
                        : v.vote === "nay"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {v.vote.toUpperCase()}
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
