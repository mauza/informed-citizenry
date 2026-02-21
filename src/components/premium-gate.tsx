import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

type Props = {
  isPremium: boolean;
  children: React.ReactNode;
};

export function PremiumGate({ isPremium, children }: Props) {
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <Lock className="h-6 w-6 mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-3">Premium Feature</p>
        <Button size="sm" asChild>
          <Link href="/settings">Upgrade to Premium</Link>
        </Button>
      </div>
    </div>
  );
}
