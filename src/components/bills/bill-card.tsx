import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

type BillCardProps = {
  bill: {
    id: string;
    billType: string;
    billNumber: string;
    title: string;
    status: string;
    stateId: string;
    lastActionDate?: Date | null;
  };
};

const STATUS_COLORS: Record<string, string> = {
  introduced: "secondary",
  in_committee: "outline",
  passed: "default",
  signed: "default",
  vetoed: "destructive",
  failed: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  introduced: "Introduced",
  in_committee: "In Committee",
  passed: "Passed",
  signed: "Signed",
  vetoed: "Vetoed",
  failed: "Failed",
};

export function BillCard({ bill }: BillCardProps) {
  return (
    <Link href={`/bills/${bill.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-medium text-muted-foreground">
                  {bill.stateId} {bill.billType} {bill.billNumber}
                </span>
                <Badge variant={(STATUS_COLORS[bill.status] ?? "secondary") as "default" | "secondary" | "destructive" | "outline"}>
                  {STATUS_LABELS[bill.status] ?? bill.status}
                </Badge>
              </div>
              <p className="font-medium leading-tight line-clamp-2">{bill.title}</p>
              {bill.lastActionDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(bill.lastActionDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
