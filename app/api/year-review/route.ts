import { auth } from "@/auth";
import { buildYearInReview } from "@/lib/sipgate";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.sipgate?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();

  try {
    const data = await buildYearInReview(session.sipgate.accessToken, year);
    if (!data) {
      return NextResponse.json({ error: "Unable to build review" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/year-review]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
