import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/sign-in-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your email or GitHub to sign in. We&apos;ll send you a magic link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm searchParams={searchParams} />
        </CardContent>
      </Card>
    </div>
  );
}
