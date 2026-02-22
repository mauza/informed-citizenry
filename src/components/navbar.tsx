import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/auth";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg">
            Informed Citizenry
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/bills" className="text-muted-foreground hover:text-foreground transition-colors">
              Bills
            </Link>
            <Link href="/legislators" className="text-muted-foreground hover:text-foreground transition-colors">
              Legislators
            </Link>
            {user && (
              <>
                <Link href="/my-votes" className="text-muted-foreground hover:text-foreground transition-colors">
                  My Votes
                </Link>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.name ?? "User"}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-votes">My Votes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button type="submit" className="w-full text-left text-sm">
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
