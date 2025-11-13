import fs from "fs/promises";
import path from "path";
import { YearReview } from "@/components/year-review";
import { auth } from "@/auth";
import type { YearReviewData } from "@/lib/sipgate";

const SHARE_DIR = path.join(process.cwd(), "tmp", "shares");

async function loadShare(id: string): Promise<YearReviewData | null> {
  try {
    const file = path.join(SHARE_DIR, `${id}.json`);
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

type SharePageProps = {
  params: Promise<{ id: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const shareData = await loadShare(id);
  const session = await auth();

  if (!shareData) {
    return (
      <main className="px-6 py-12 text-center text-white">
        <p>We couldn’t find this shared recap.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <YearReview
          data={shareData}
          displayName={session?.user?.name ?? "Anonymous"}
          autoFetch={false}
          enableShare={false}
        />
      </div>
    </main>
  );
}
