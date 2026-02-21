import { getLegislators, getStates } from "@/lib/queries";
import { RepCard } from "@/components/legislators/rep-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { auth } from "@/auth";
import { isPremiumUser } from "@/lib/queries";

export default async function LegislatorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    chamber?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 0);
  const session = await auth();
  const isPremium = session?.user?.id ? await isPremiumUser(session.user.id) : false;

  const [legislators, states] = await Promise.all([
    getLegislators({
      stateId: params.state,
      chamber: params.chamber,
      search: params.q,
      page,
      limit: 20,
    }),
    getStates(),
  ]);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { state: params.state, chamber: params.chamber, q: params.q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") p.set(k, v);
    }
    return `/legislators?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Legislators</h1>
        <p className="text-muted-foreground">Browse your elected representatives.</p>
      </div>

      <form className="flex flex-wrap gap-3">
        <Input
          name="q"
          placeholder="Search by name..."
          defaultValue={params.q}
          className="max-w-xs"
        />
        <Select name="state" defaultValue={params.state ?? "all"}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="chamber" defaultValue={params.chamber ?? "all"}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Chamber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Both Chambers</SelectItem>
            <SelectItem value="H">House</SelectItem>
            <SelectItem value="S">Senate</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      {legislators.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No legislators found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {legislators.map((leg) => (
            <RepCard key={leg.id} legislator={leg} isPremium={isPremium} />
          ))}
        </div>
      )}

      <div className="flex justify-between">
        {page > 0 ? (
          <Button variant="outline" asChild>
            <Link href={buildUrl({ page: String(page - 1) })}>Previous</Link>
          </Button>
        ) : <div />}
        {legislators.length === 20 && (
          <Button variant="outline" asChild>
            <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
