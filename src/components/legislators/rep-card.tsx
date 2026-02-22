import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock } from "lucide-react";

type RepCardProps = {
  legislator: {
    id: string;
    firstName: string;
    lastName: string;
    party: string | null;
    chamber: string;
    stateId: string;
    role: string | null;
    photoUrl: string | null;
    score: string | null;
    billsAnalyzed: number | null;
  };
  isPremium: boolean;
};

const PARTY_COLORS: Record<string, string> = {
  D: "bg-blue-100 text-blue-800 border-blue-200",
  R: "bg-red-100 text-red-800 border-red-200",
  I: "bg-purple-100 text-purple-800 border-purple-200",
};

export function RepCard({ legislator, isPremium }: RepCardProps) {
  const initials = `${legislator.firstName.charAt(0)}${legislator.lastName.charAt(0)}`;
  const partyClass = legislator.party ? (PARTY_COLORS[legislator.party] ?? "") : "";

  return (
    <Link href={`/legislators/${legislator.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="py-4 flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={legislator.photoUrl ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1 min-w-0">
            <p className="font-medium leading-tight">
              {legislator.firstName} {legislator.lastName}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {legislator.party && (
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${partyClass}`}>
                  {legislator.party}
                </span>
              )}
              <Badge variant="outline" className="text-xs">
                {legislator.chamber === "H" ? "House" : "Senate"}
              </Badge>
              <span className="text-xs text-muted-foreground">{legislator.stateId}</span>
            </div>
            {/* Representation Score */}
            {isPremium && legislator.score !== null ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {Number(legislator.score).toFixed(1)}%
                </span>
                <span>alignment</span>
                {legislator.billsAnalyzed !== null && (
                  <span>({legislator.billsAnalyzed} bills)</span>
                )}
              </div>
            ) : !isPremium && legislator.score !== null ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Score (Premium)</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
