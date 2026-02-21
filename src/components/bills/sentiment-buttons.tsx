"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { submitSentiment, removeSentiment } from "@/lib/actions/sentiment";
import { toast } from "sonner";

type Props = {
  billId: string;
  initialSentiment: "support" | "oppose" | null;
  supportCount: number;
  opposeCount: number;
  isAuthenticated: boolean;
};

export function SentimentButtons({
  billId,
  initialSentiment,
  supportCount: initialSupport,
  opposeCount: initialOppose,
  isAuthenticated,
}: Props) {
  const [sentiment, setSentiment] = useState(initialSentiment);
  const [supportCount, setSupportCount] = useState(initialSupport);
  const [opposeCount, setOpposeCount] = useState(initialOppose);
  const [isPending, startTransition] = useTransition();

  function handleVote(newSentiment: "support" | "oppose") {
    if (!isAuthenticated) {
      toast.error("Sign in to vote on bills.");
      return;
    }

    startTransition(async () => {
      const prevSentiment = sentiment;

      // Optimistic update
      if (sentiment === newSentiment) {
        setSentiment(null);
        if (newSentiment === "support") setSupportCount((c) => Math.max(0, c - 1));
        else setOpposeCount((c) => Math.max(0, c - 1));
        const result = await removeSentiment(billId);
        if (result.error) {
          setSentiment(prevSentiment);
          if (newSentiment === "support") setSupportCount((c) => c + 1);
          else setOpposeCount((c) => c + 1);
          toast.error(result.error);
        }
      } else {
        const prev = sentiment;
        setSentiment(newSentiment);
        if (prev === "support") setSupportCount((c) => Math.max(0, c - 1));
        if (prev === "oppose") setOpposeCount((c) => Math.max(0, c - 1));
        if (newSentiment === "support") setSupportCount((c) => c + 1);
        else setOpposeCount((c) => c + 1);

        const result = await submitSentiment(billId, newSentiment);
        if (result.error) {
          setSentiment(prevSentiment);
          setSupportCount(initialSupport);
          setOpposeCount(initialOppose);
          toast.error(result.error);
        }
      }
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        variant={sentiment === "support" ? "default" : "outline"}
        className={sentiment === "support" ? "bg-green-600 hover:bg-green-700" : "border-green-600 text-green-600 hover:bg-green-50"}
        onClick={() => handleVote("support")}
        disabled={isPending}
      >
        <ThumbsUp className="mr-2 h-4 w-4" />
        Support · {supportCount}
      </Button>
      <Button
        variant={sentiment === "oppose" ? "destructive" : "outline"}
        className={sentiment === "oppose" ? "" : "border-red-500 text-red-500 hover:bg-red-50"}
        onClick={() => handleVote("oppose")}
        disabled={isPending}
      >
        <ThumbsDown className="mr-2 h-4 w-4" />
        Oppose · {opposeCount}
      </Button>
      {!isAuthenticated && (
        <p className="text-sm text-muted-foreground">Sign in to vote</p>
      )}
    </div>
  );
}
