import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { FUNNY_CONTACT_LABELS, type YearReviewData } from "@/lib/sipgate";

const SHARE_DIR = path.join(process.cwd(), "tmp", "shares");

const SHARE_ADJECTIVES = [
  "galactic",
  "prismatic",
  "retro",
  "electric",
  "mythic",
  "sonic",
  "cosmic",
  "midnight",
  "vintage",
  "lush",
] as const;

const SHARE_ANIMALS = [
  "llama",
  "penguin",
  "lynx",
  "otter",
  "badger",
  "viper",
  "sparrow",
  "orca",
  "panda",
  "yak",
] as const;

const sanitize = (payload: YearReviewData): YearReviewData => {
  const aliasMap = new Map<string, string>();
  let aliasIndex = 0;

  const nextAlias = () => {
    const base = FUNNY_CONTACT_LABELS[aliasIndex % FUNNY_CONTACT_LABELS.length];
    const suffix =
      aliasIndex >= FUNNY_CONTACT_LABELS.length
        ? ` #${Math.floor(aliasIndex / FUNNY_CONTACT_LABELS.length) + 1}`
        : "";
    aliasIndex += 1;
    return `${base}${suffix}`;
  };

  const aliasFor = (value?: string | null) => {
    if (!value) return nextAlias();
    if (!aliasMap.has(value)) {
      aliasMap.set(value, nextAlias());
    }
    return aliasMap.get(value) as string;
  };

  return {
    ...payload,
    topContacts: payload.topContacts.map((contact) => ({
      ...contact,
      name: aliasFor(contact.name),
    })),
    longestCall: payload.longestCall
      ? {
          minutes: payload.longestCall.minutes,
          contact: aliasFor(payload.longestCall.contact),
        }
      : undefined,
  };
};

async function generateShareId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const adjective = SHARE_ADJECTIVES[Math.floor(Math.random() * SHARE_ADJECTIVES.length)];
    const animal = SHARE_ANIMALS[Math.floor(Math.random() * SHARE_ANIMALS.length)];
    const digits = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const candidate = `${adjective}-${animal}-${digits}`;
    try {
      await fs.access(path.join(SHARE_DIR, `${candidate}.json`));
    } catch {
      return candidate;
    }
  }
  return randomUUID();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as YearReviewData;
    const sanitized = sanitize(body);
    await fs.mkdir(SHARE_DIR, { recursive: true });
    const id = await generateShareId();
    const file = path.join(SHARE_DIR, `${id}.json`);
    await fs.writeFile(file, JSON.stringify(sanitized, null, 2), "utf8");
    return NextResponse.json({ id, url: `/share/${id}` });
  } catch (error) {
    console.error("[share] failed", error);
    return NextResponse.json({ error: "Unable to share recap" }, { status: 500 });
  }
}
