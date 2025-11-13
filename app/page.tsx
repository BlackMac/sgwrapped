import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { YearReview } from "@/components/year-review";

export default async function Home() {
  const session = await auth();
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fef9ff] via-[#f4f2ff] to-[#eef8ff] px-4 py-10 font-[var(--font-geist-sans)] text-black sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/50">
              sipgate PBX recap
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              Year in review
            </h1>
          </div>
          {session ? (
            <SignOutButton />
          ) : (
            <SignInButton />
          )}
        </header>

        {session ? (
          <YearReview
            data={null}
            displayName={session.user?.name || "You"}
            year={year}
            autoFetch
          />
        ) : (
          <LoggedOutHero />
        )}
      </div>
    </main>
  );
}

const LoggedOutHero = () => (
  <section className="rounded-3xl bg-white px-8 py-12 text-center shadow-xl">
    <h2 className="text-3xl font-semibold text-black">
      Sign in with sipgate to unlock your PBX recap.
    </h2>
    <p className="mx-auto mt-4 max-w-2xl text-base text-black/70">
      We connect to sipgate via OAuth, gather call history through the official API, and remix it into Spotify-style storytelling.
      Your tokens stay server-side and are only used to build these insights.
    </p>
    <div className="mt-6 flex justify-center">
      <SignInButton />
    </div>
    <ul className="mt-8 grid gap-4 text-left sm:grid-cols-3">
      {[
        "Secure OAuth login powered by NextAuth.js",
        "History + numbers scopes to read your PBX stream",
        "Creative stats like streaks, top collaborators, and peak hours",
      ].map((item) => (
        <li key={item} className="rounded-2xl border border-black/10 p-4 text-sm text-black/70">
          {item}
        </li>
      ))}
    </ul>
  </section>
);
