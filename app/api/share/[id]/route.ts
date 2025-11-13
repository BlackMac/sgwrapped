import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const SHARE_DIR = path.join(process.cwd(), "tmp", "shares");

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const { id } = await params;
  try {
    const file = path.join(SHARE_DIR, `${id}.json`);
    const data = await fs.readFile(file, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
}
