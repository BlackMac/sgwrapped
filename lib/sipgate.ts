import "server-only";

import {
  createHistoryModule,
  sipgateIO,
  type HistoryEntry,
  HistoryEntryType,
} from "sipgateio";

const MAX_HISTORY_ENTRIES = 6000;
const HISTORY_CHUNK_SIZE = 50;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type ContactStat = {
  name: string;
  count: number;
  totalMinutes: number;
};

export type YearReviewData = {
  year: number;
  hasData: boolean;
  totals: {
    all: number;
    inbound: number;
    outbound: number;
    minutes: number;
  };
  monthlyBreakdown: Array<{ month: string; calls: number }>;
  busiestHour: { hour: number; count: number };
  hourlyBreakdown?: Array<{ hour: number; calls: number }>;
  longestStreak: { days: number; endedOn?: string };
  topContacts: ContactStat[];
  longestCall?: {
    minutes: number;
    contact: string;
  };
  errorMessage?: string;
  smsReceived?: number;
  faxReceived?: number;
};

export async function buildYearInReview(
  accessToken: string,
  year = new Date().getFullYear(),
): Promise<YearReviewData | null> {
  if (!accessToken) {
    return null;
  }

  const { from, to } = getYearBounds(year);

  try {
    const client = sipgateIO({ token: accessToken });
    const history = createHistoryModule(client);
    const entries = await fetchHistoryInChunks(history, { from, to });

    return summarizeHistory(entries, year);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sipgate error";
    console.error("[sipgate] Failed to load history for review", message);
    return {
      ...emptyYear(year),
      errorMessage:
        message.includes("503")
          ? "sipgate is temporarily unavailable (503). Please try again shortly."
          : message,
    } as YearReviewData;
  }
}

type HistoryModuleClient = ReturnType<typeof createHistoryModule>;

type SipgateApiError = {
  response?: {
    status?: number;
  };
};

async function fetchHistoryInChunks(
  history: HistoryModuleClient,
  { from, to }: { from: Date; to: Date },
): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  let offset = 0;

  while (entries.length < MAX_HISTORY_ENTRIES) {
    let page: HistoryEntry[] = [];
    try {
      page = await history.fetchAll(
        { startDate: from, endDate: to },
        { limit: HISTORY_CHUNK_SIZE, offset },
      );
    } catch (error: unknown) {
      console.error("[sipgate] history pagination failed", error);
      const status = (error as SipgateApiError)?.response?.status;
      if (status === 401) {
        throw new Error("Unauthorized");
      }
      break;
    }

    entries.push(...page);

    if (page.length < HISTORY_CHUNK_SIZE) {
      break; // no more pages
    }

    offset += HISTORY_CHUNK_SIZE;
  }

  return entries.slice(0, MAX_HISTORY_ENTRIES);
}

function summarizeHistory(entries: HistoryEntry[], year: number): YearReviewData {
  if (!entries.length) {
    return emptyYear(year);
  }

  let inbound = 0;
  let outbound = 0;
  let totalMinutes = 0;
  let longestCallMinutes = 0;
  let longestCallContact = "—";
  let smsReceived = 0;
  let faxReceived = 0;

  const monthlyCounters = Array(12).fill(0);
  const hourlyCounters = Array(24).fill(0);
  const dayKeys = new Set<number>();
  const contacts = new Map<string, ContactStat>();

  for (const entry of entries) {
    const created = toDate(entry.created);
    const last = entry.lastModified ? toDate(entry.lastModified) : created;
    if (!created) continue;

    const minutes = Math.max(
      0,
      ((last?.getTime() ?? created.getTime()) - created.getTime()) / 60000,
    );
    totalMinutes += minutes;

    if (entry.incoming) {
      inbound += 1;
    } else {
      outbound += 1;
    }

    if (entry.type === HistoryEntryType.SMS) {
      smsReceived += entry.incoming ? 1 : 0;
    }

    if (entry.type === HistoryEntryType.FAX) {
      faxReceived += entry.incoming ? 1 : 0;
    }

    const monthIndex = created.getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyCounters[monthIndex] += 1;
    }

    const hour = created.getHours();
    hourlyCounters[hour] = (hourlyCounters[hour] ?? 0) + 1;

    dayKeys.add(dayKey(created));

    const contactName = getContactName(entry);
    const existing = contacts.get(contactName) ?? {
      name: contactName,
      count: 0,
      totalMinutes: 0,
    };
    existing.count += 1;
    existing.totalMinutes += minutes;
    contacts.set(contactName, existing);

    if (minutes > longestCallMinutes) {
      longestCallMinutes = minutes;
      longestCallContact = contactName;
    }
  }

  const monthlyBreakdown = MONTH_LABELS.map((month, index) => ({
    month,
    calls: monthlyCounters[index] ?? 0,
  }));

  const busiestHourIndex = getIndexOfMax(hourlyCounters);
  const busiestHour = {
    hour: busiestHourIndex,
    count: hourlyCounters[busiestHourIndex] ?? 0,
  };

  const longestStreak = computeLongestStreak(dayKeys);

  const topContacts = Array.from(contacts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    year,
    hasData: true,
    totals: {
      all: entries.length,
      inbound,
      outbound,
      minutes: Math.round(totalMinutes),
    },
    monthlyBreakdown,
    busiestHour,
    hourlyBreakdown: hourlyCounters.map((value, hour) => ({ hour, calls: value })),
    longestStreak,
    topContacts,
    longestCall: longestCallMinutes
      ? {
          minutes: Math.round(longestCallMinutes),
          contact: longestCallContact,
        }
      : undefined,
    smsReceived,
    faxReceived,
  };
}

function emptyYear(year: number): YearReviewData {
  return {
    year,
    hasData: false,
    totals: {
      all: 0,
      inbound: 0,
      outbound: 0,
      minutes: 0,
    },
    monthlyBreakdown: MONTH_LABELS.map((month) => ({ month, calls: 0 })),
    busiestHour: { hour: 0, count: 0 },
    longestStreak: { days: 0 },
    topContacts: [],
    longestCall: undefined,
    smsReceived: 0,
    faxReceived: 0,
    hourlyBreakdown: Array.from({ length: 24 }).map((_, hour) => ({ hour, calls: 0 })),
  };
}

function toDate(value: Date | string | number | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(date: Date): number {
  return Math.floor(date.getTime() / 86400000);
}

function computeLongestStreak(daySet: Set<number>): {
  days: number;
  endedOn?: string;
} {
  const days = Array.from(daySet).sort((a, b) => a - b);

  let best = { length: 0, end: undefined as number | undefined };
  let current = { length: 0, end: undefined as number | undefined };
  let previous: number | undefined;

  for (const day of days) {
    if (previous !== undefined && day === previous + 1) {
      current.length += 1;
      current.end = day;
    } else {
      current = { length: 1, end: day };
    }

    if (current.length > best.length) {
      best = { ...current };
    }

    previous = day;
  }

  return {
    days: best.length,
    endedOn: typeof best.end === "number" ? dateFromDayKey(best.end) : undefined,
  };
}

function dateFromDayKey(key: number): string {
  return new Date(key * 86400000).toISOString().slice(0, 10);
}

function getIndexOfMax(values: number[]): number {
  return values.reduce(
    (bestIndex, value, index, array) =>
      value > array[bestIndex] ? index : bestIndex,
    0,
  );
}

export const FUNNY_CONTACT_LABELS = [
  "An anonymous llama",
  "Mystery caller",
  "Unnamed legend",
  "Secret hotline",
  "A stealthy penguin",
  "Shadowy sparrow",
  "Incognito otter",
  "Low-key lynx",
  "Secretive badger",
  "Silent hedgehog",
] as const;

function getContactName(entry: HistoryEntry): string {
  const inbound = entry.incoming;
  const alias = inbound ? entry.sourceAlias : entry.targetAlias;
  if (alias && alias.trim().length > 0) {
    return alias.trim();
  }
  const seededIndex = Math.abs(hashString(entry.id ?? "")) % FUNNY_CONTACT_LABELS.length;
  return FUNNY_CONTACT_LABELS[seededIndex] ?? "Anonymous";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getYearBounds(year: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  return { from, to };
}
