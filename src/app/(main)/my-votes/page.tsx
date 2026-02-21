import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserVotes } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  introduced: "Introduced",
  in_committee: "In Committee",
  passed: "Passed",
  signed: "Signed",
  vetoed: "Vetoed",
  failed: "Failed",
};

export default async function MyVotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const votes = await getUserVotes(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Votes</h1>
        <p className="text-muted-foreground">Bills you&apos;ve supported or opposed.</p>
      </div>

      {votes.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">You haven&apos;t voted on any bills yet.</p>
          <Button asChild>
            <Link href="/bills">Browse Bills</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {votes.map((vote) => (
            <Link key={vote.id} href={`/bills/${vote.billId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-muted-foreground">
                          {vote.billType} {vote.billNumber}
                        </span>
                        <Badge variant="outline">
                          {STATUS_LABELS[vote.status] ?? vote.status}
                        </Badge>
                      </div>
                      <p className="font-medium line-clamp-2">{vote.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Voted {new Date(vote.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {vote.sentiment === "support" ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <ThumbsUp className="h-4 w-4" /> Support
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
                          <ThumbsDown className="h-4 w-4" /> Oppose
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
