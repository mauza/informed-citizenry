const LEGISCAN_API_BASE = "https://api.legiscan.com/";
const API_KEY = process.env.LEGISCAN_API_KEY!;

async function legiscanFetch<T>(op: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(LEGISCAN_API_BASE);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("op", op);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`LegiScan API error: ${res.status}`);
  const json = await res.json();
  if (json.status !== "OK") throw new Error(`LegiScan error: ${json.alert?.message ?? "Unknown"}`);
  return json;
}

export async function getSessionList(state: string) {
  const data = await legiscanFetch<{ sessions: LegiscanSession[] }>("getSessionList", { state });
  return data.sessions;
}

export async function getMasterList(sessionId: number) {
  const data = await legiscanFetch<{ masterlist: Record<string, LegiscanBillMeta> }>("getMasterList", {
    id: sessionId,
  });
  const { masterlist } = data;
  return Object.values(masterlist).filter((b) => typeof b === "object" && b.bill_id);
}

export async function getBill(billId: number) {
  const data = await legiscanFetch<{ bill: LegiscanBill }>("getBill", { id: billId });
  return data.bill;
}

export async function getRollCall(rollCallId: number) {
  const data = await legiscanFetch<{ roll_call: LegiscanRollCall }>("getRollCall", { id: rollCallId });
  return data.roll_call;
}

export async function getPerson(peopleId: number) {
  const data = await legiscanFetch<{ person: LegiscanPerson }>("getPerson", { id: peopleId });
  return data.person;
}

export interface LegiscanSession {
  session_id: number;
  state_id: number;
  year_start: number;
  year_end: number;
  prefile: number;
  sine_die: number;
  prior: number;
  special: number;
  session_name: string;
  name: string;
}

export interface LegiscanBillMeta {
  bill_id: number;
  number: string;
  change_hash: string;
  url: string;
  status_date: string;
  status: number;
  last_action_date: string;
  last_action: string;
  title: string;
  description: string;
}

export interface LegiscanBill {
  bill_id: number;
  change_hash: string;
  session_id: number;
  session: { session_id: number; year_start: number; year_end: number };
  url: string;
  state_link: string;
  completed: number;
  status: number;
  status_date: string;
  progress: Array<{ date: string; event: number }>;
  state: string;
  state_id: number;
  bill_id_str: string;
  bill_number: string;
  bill_type: string;
  bill_type_id: string;
  body: string;
  body_id: number;
  current_body: string;
  current_body_id: number;
  title: string;
  description: string;
  pending_committee_id: number;
  committee: { committee_id: number; chamber: string; name: string } | null;
  referrals: Array<{ date: string; committee_id: number; chamber: string; name: string }>;
  history: Array<{ date: string; action: string; chamber: string; importance: number }>;
  sponsors: Array<{
    people_id: number;
    party: string;
    role: string;
    name: string;
    first_name: string;
    last_name: string;
    sponsor_type_id: number;
  }>;
  votes: Array<{ roll_call_id: number; date: string; desc: string; yea: number; nay: number; nv: number; absent: number; total: number; passed: number; chamber: string }>;
  amendments: unknown[];
  supplements: unknown[];
  calendar: unknown[];
  texts: Array<{ doc_id: number; date: string; type: string; type_id: number; mime: string; mime_id: number; url: string; state_link: string; antihtml: string; local_copy: number }>;
  sasts: unknown[];
  subjects: unknown[];
}

export interface LegiscanRollCall {
  roll_call_id: number;
  bill_id: number;
  date: string;
  desc: string;
  yea: number;
  nay: number;
  nv: number;
  absent: number;
  total: number;
  passed: number;
  chamber: string;
  chamber_id: number;
  votes: Array<{
    people_id: number;
    vote_id: number;
    vote_text: string;
    name?: string;
  }>;
}

export interface LegiscanPerson {
  people_id: number;
  person_hash: string;
  state_id: number;
  party_id: number;
  party: string;
  role_id: number;
  role: string;
  name: string;
  first_name: string;
  last_name: string;
  suffix: string;
  nickname: string;
  district: string;
  ftm_eid: number;
  votesmart_id: number;
  opensecrets_id: string;
  knowwho_pid: number;
  ballotpedia: string;
  bioguide_id: string;
  committee_sponsor: number;
  committee_id: number;
}

// Map LegiScan status codes to our status strings
export function mapLegiscanStatus(status: number): string {
  const map: Record<number, string> = {
    1: "introduced",
    2: "in_committee",
    3: "passed",
    4: "signed",
    5: "vetoed",
    6: "failed",
  };
  return map[status] ?? "introduced";
}
