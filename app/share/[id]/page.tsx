import fs from "fs/promises";
import path from "path";
import { YearReview } from "@/components/year-review";
import type { YearReviewData } from "@/lib/sipgate";

const SHARE_DIR = path.join(process.cwd(), "tmp", "shares");

type SharedRecap = {
  review: YearReviewData;
  displayName: string;
};

async function loadShare(id: string): Promise<SharedRecap | null> {
  try {
    const file = path.join(SHARE_DIR, `${id}.json`);
    const data = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(data) as Partial<SharedRecap>;
    if (!parsed?.review) {
      return null;
    }
    return {
      review: parsed.review,
      displayName: parsed.displayName?.trim() || "Anonymous",
    };
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
          data={shareData.review}
          displayName={shareData.displayName}
          autoFetch={false}
          enableShare={false}
        />
      </div>
    </main>
  );
}
