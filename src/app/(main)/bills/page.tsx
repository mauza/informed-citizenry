import { getBills, getStates } from "@/lib/queries";
import { BillCard } from "@/components/bills/bill-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "introduced", label: "Introduced" },
  { value: "in_committee", label: "In Committee" },
  { value: "passed", label: "Passed" },
  { value: "signed", label: "Signed" },
  { value: "vetoed", label: "Vetoed" },
  { value: "failed", label: "Failed" },
];

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 0);

  const [bills, states] = await Promise.all([
    getBills({
      stateId: params.state,
      status: params.status,
      search: params.q,
      page,
      limit: 20,
    }),
    getStates(),
  ]);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { state: params.state, status: params.status, q: params.q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") p.set(k, v);
    }
    return `/bills?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bills</h1>
        <p className="text-muted-foreground">Browse and track legislation across the country.</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <Input
          name="q"
          placeholder="Search bills..."
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
        <Select name="status" defaultValue={params.status ?? "all"}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      {/* Bill list */}
      {bills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No bills found matching your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center">
        {page > 0 ? (
          <Button variant="outline" asChild>
            <Link href={buildUrl({ page: String(page - 1) })}>Previous</Link>
          </Button>
        ) : (
          <div />
        )}
        {bills.length === 20 && (
          <Button variant="outline" asChild>
            <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
