"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requestBillSummary } from "@/lib/actions/ai-summary";
import { Sparkles } from "lucide-react";

type Props = {
  billId: string;
  initialSummary: string | null;
};

export function AiSummarySection({ billId, initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    if (!initialSummary) {
      requestBillSummary(billId).then((result) => {
        if (result.summary) setSummary(result.summary);
        setLoading(false);
      });
    }
  }, [billId, initialSummary]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : summary ? (
          <p className="text-sm leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Summary unavailable for this bill.</p>
        )}
      </CardContent>
    </Card>
  );
}
