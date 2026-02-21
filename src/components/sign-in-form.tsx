"use client";

import { useState, use } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Github } from "lucide-react";

export function SignInForm({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  const params = use(searchParams);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (params.verify) {
    return (
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">Check your email</p>
        <p className="text-muted-foreground text-sm">
          We sent a magic link to your email address. Click it to sign in.
        </p>
      </div>
    );
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("resend", { email, redirect: false });
      if (result?.error) {
        toast.error("Failed to send magic link. Try again.");
      } else {
        toast.success("Magic link sent! Check your email.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {params.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          Sign in failed. Please try again.
        </p>
      )}
      <form onSubmit={handleEmailSignIn} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send magic link"}
        </Button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn("github", { callbackUrl: "/" })}
      >
        <Github className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
