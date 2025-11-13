"use client";

import type { YearReviewData } from "@/lib/sipgate";
import { useCallback, useEffect, useState, useTransition } from "react";

type Props = {
  data: YearReviewData | null;
  displayName: string;
  year?: number;
  autoFetch?: boolean;
  enableShare?: boolean;
};

type Slide = {
  id: string;
  title: string;
  subtitle?: string;
  statistic?: string;
  description?: string;
  footer?: string;
  accent: string;
  listItems?: string[];
  animated?: boolean;
  animationDelay?: number;
  bars?: Array<{ label: string; value: number }>; // for simple bar chart
  barsLabel?: string;
};

const gradients = [
  "from-[#090979] via-[#7b2ff7] to-[#f953c6]",
  "from-[#0f172a] via-[#4f46e5] to-[#ec4899]",
  "from-[#111827] via-[#2563eb] to-[#22d3ee]",
  "from-[#1f2937] via-[#f97316] to-[#ef4444]",
  "from-[#0f172a] via-[#14b8a6] to-[#84cc16]",
];

export const YearReview = ({
  data,
  displayName,
  year,
  autoFetch = false,
  enableShare = true,
}: Props) => {
  const [review, setReview] = useState<YearReviewData | null>(data);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(autoFetch);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
if (!autoFetch) return;
    let cancelled = false;
    setIsFetching(true);
    setFetchError(null);
    fetch(`/api/year-review${year ? `?year=${year}` : ""}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.assign("/api/auth/signout");
          return Promise.reject(new Error("Unauthorized"));
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load Year in Review");
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setReview(json);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [autoFetch, year]);

  const showEmptyState = !review && !isFetching;

  useEffect(() => {
    setSlides(null);
    const frame = window.requestAnimationFrame(() => {
      startTransition(() => {
        if (review) {
          setSlides(buildSlides(review, displayName));
        }
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [review, displayName]);

  useEffect(() => {
    setShareUrl(null);
    setShareError(null);
    setIsSharing(false);
  }, [review]);

  const handleShare = useCallback(async () => {
    if (!review) return;
    setIsSharing(true);
    setShareError(null);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ review, displayName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) {
        throw new Error(payload.error || "Unable to create share link");
      }
      const link = payload.url.startsWith("http")
        ? payload.url
        : `${window.location.origin}${payload.url}`;
      setShareUrl(link);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create share link";
      setShareError(message);
    } finally {
      setIsSharing(false);
    }
  }, [review, displayName]);

  return (
    <div className="space-y-4">
      {review?.errorMessage && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900">
          <p className="text-sm font-medium">{review.errorMessage}</p>
        </div>
      )}
      {showEmptyState ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-red-800">
          <p className="text-lg font-semibold">We could not load your PBX data.</p>
          <p className="mt-2 text-sm text-red-700">
            {fetchError || "Reconnect to sipgate and ensure your OAuth scopes include history permissions."}
          </p>
        </div>
      ) : slides && !isPending ? (
        <>
          <StorySlider slides={slides} />
          {enableShare && review && (
            <ShareControls
              canShare={review.hasData}
              shareUrl={shareUrl}
              shareError={shareError}
              isSharing={isSharing}
              onShare={handleShare}
            />
          )}
        </>
      ) : (
        <LoadingSpinner
          isFading={!slides && isPending}
          label={isFetching ? "Building your recap…" : "Preparing your recap…"}
        />
      )}
    </div>
  );
};

type StorySliderProps = {
  slides: Slide[];
};

const StorySlider = ({ slides }: StorySliderProps) => {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      const capped = (next + slides.length) % slides.length;
      setIndex(capped);
    },
    [slides.length],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, index]);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1 w-12 rounded-full transition ${
              i === index ? "bg-black" : "bg-black/20"
            }`}
          />
        ))}
      </div>
      <div className="relative overflow-hidden rounded-[40px] bg-black text-white shadow-2xl">
        <div
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <article
              key={slide.id}
              className={`min-w-full px-8 py-12 sm:px-16 sm:py-16 bg-gradient-to-br ${slide.accent} ${
                slide.animated ? "animate-slide-in" : ""
              }`}
              style={slide.animationDelay ? { animationDelay: `${slide.animationDelay}ms` } : undefined}
            >
              <div className="flex h-full flex-col justify-between">
                <div className={slide.bars ? "sm:flex sm:items-start sm:gap-12" : ""}>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                      sipgate year in review
                    </p>
                    <h2 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p className="mt-3 text-lg text-white/80">{slide.subtitle}</p>
                    )}
                    {slide.statistic && (
                      <p className="mt-12 text-6xl font-semibold tracking-tight">
                        {slide.statistic}
                      </p>
                    )}
                    {slide.description && (
                      <p className="mt-4 max-w-2xl text-base text-white/80">
                        {slide.description}
                      </p>
                    )}
                    {slide.listItems && (
                      <ul className="mt-6 space-y-2 text-lg">
                        {slide.listItems.map((item, idx) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="text-white/60">{idx + 1}</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {slide.bars && (
                    <div
                      className="mt-8 text-xs text-white/80 sm:mt-0 sm:w-1/3 animate-bars"
                      style={{ animationDelay: `${slide.animationDelay ?? 0}ms` }}
                    >
                      {slide.barsLabel && (
                        <p className="mb-2 text-white/60">{slide.barsLabel}</p>
                      )}
                      {slide.bars.map((bar) => (
                        <div key={bar.label} className="mb-1 flex items-center gap-2">
                          <span className="w-8 text-white/60">{bar.label}</span>
                          <div className="h-1 flex-1 rounded-full bg-white/20">
                            <div
                              className="h-1 rounded-full bg-white"
                              style={{ width: `${Math.min(
                                100,
                                (bar.value /
                                  (Math.max(...slide.bars!.map((b) => b.value)) || 1)) * 100,
                              )}%` }}
                            />
                          </div>
                          <span>{bar.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {slide.footer && (
                  <p className="mt-10 text-sm uppercase tracking-[0.2em] text-white/60">
                    {slide.footer}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6">
          <button
            onClick={() => goTo(index - 1)}
            className="pointer-events-auto hidden h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur sm:flex"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => goTo(index + 1)}
            className="pointer-events-auto hidden h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur sm:flex"
            aria-label="Next slide"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
};

type ShareControlsProps = {
  canShare: boolean;
  onShare: () => void;
  shareUrl: string | null;
  shareError: string | null;
  isSharing: boolean;
};

const ShareControls = ({ canShare, onShare, shareUrl, shareError, isSharing }: ShareControlsProps) => {
  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
  }, [shareUrl]);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-white/80 p-6 text-black shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/60">
            Share your recap
          </p>
          <p className="text-base text-black/70">
            Generate a private link with anonymized contacts.
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          disabled={!canShare || isSharing}
          className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:bg-black/40"
        >
          {isSharing ? "Generating…" : "Create share link"}
        </button>
      </div>
      {!canShare && (
        <p className="text-sm text-black/60">
          Place some calls first — we need real data before we can share a story.
        </p>
      )}
      {shareUrl && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 rounded-2xl border border-black px-4 py-2 text-sm font-medium text-black sm:mt-0"
          >
            Copy link
          </button>
        </div>
      )}
      {shareError && <p className="text-sm text-red-600">{shareError}</p>}
    </div>
  );
};

const LoadingSpinner = ({
  isFading = false,
  label,
}: {
  isFading?: boolean;
  label?: string;
}) => (
  <div
    className={`flex h-[520px] items-center justify-center rounded-[40px] bg-black text-white shadow-2xl transition-opacity ${
      isFading ? "opacity-80" : "opacity-100"
    }`}
  >
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      <p className="text-sm uppercase tracking-[0.3em] text-white/70">
        {label ?? "Preparing your recap…"}
      </p>
    </div>
  </div>
);

const buildSlides = (data: YearReviewData, displayName: string): Slide[] => {
  const firstName = displayName.split(" ")[0] || "You";
  const totalMinutes = Math.round(data.totals.minutes);
  const peakMonth =
    data.monthlyBreakdown.reduce(
      (best, current) => (current.calls > best.calls ? current : best),
      data.monthlyBreakdown[0],
    ) ?? { month: "—", calls: 0 };
  const topList = data.topContacts.slice(0, 5).map((contact) => `${contact.name} — ${contact.count} calls`);
  const commsExtras = [
    data.smsReceived ? `${formatNumber(data.smsReceived)} SMS` : null,
    data.faxReceived ? `${formatNumber(data.faxReceived)} faxes` : null,
  ].filter(Boolean) as string[];
  const longestCallDescription = data.longestCall;
  const monthlyBars = data.monthlyBreakdown.map(({ month, calls }) => ({ label: month, value: calls }));
  const hourlyBars = data.hourlyBreakdown
    ? data.hourlyBreakdown
        .filter(({ hour }) => hour >= 8 && hour <= 18)
        .map(({ hour, calls }) => ({ label: `${hour}:00`, value: calls }))
    : [];

  const slides: Slide[] = [
    {
      id: "intro",
      title: `${firstName}, your PBX made waves in ${data.year}.`,
      subtitle: data.hasData
        ? "Tap through to relive the most iconic call moments."
        : "Make your first call to unlock the full story.",
      statistic: data.hasData ? `${formatNumber(data.totals.all)} calls` : "—",
      description: data.hasData
        ? "Every connection, answered or dialed, counted toward this number."
        : "We’ll craft your recap once sipgate starts sharing call history.",
      footer: "Slide 1",
      accent: gradients[0],
      animated: true,
    },
    {
      id: "minutes",
      title: "Total minutes on the line",
      subtitle: "From hello to goodbye, every second mattered.",
      statistic: data.hasData ? `${formatNumber(totalMinutes)} min` : "—",
      description: data.hasData
        ? `Inbound vs outbound split: ${formatNumber(data.totals.inbound)} inbound / ${formatNumber(
            data.totals.outbound,
          )} outbound calls.`
        : "Place some calls to unlock this stat.",
      footer: "Slide 2",
      accent: gradients[1],
      animated: true,
      animationDelay: 150,
    },
    {
      id: "busiest",
      title: `Your peak month was ${peakMonth.month}`,
      subtitle: `It packed ${peakMonth.calls} calls into 30-ish days.`,
      statistic: data.hasData ? `${peakMonth.calls}` : "—",
      description:
        data.hasData && data.longestStreak.days
          ? `Longest streak: ${data.longestStreak.days} days straight.`
          : "Keep the lines buzzing to find your busiest streak.",
      footer: "Slide 3",
      accent: gradients[2],
      bars: monthlyBars,
      barsLabel: "Calls per month",
      animated: true,
      animationDelay: 300,
    },
    topList.length
      ? {
          id: "top_collabs",
          title: "Your top collaborators",
          subtitle: "You made room for more than one favorite.",
          description: `They owned ${data.year}.`,
          listItems: topList,
          footer: "Slide 5",
          accent: gradients[3],
        }
      : {
          id: "contacts",
          title: "Top collaborators await",
          description: "Once you start calling, we’ll highlight your go-to teammates.",
          footer: "Slide 5",
          accent: gradients[3],
        },
  ];

  if (commsExtras.length) {
    slides.splice(4, 0, {
      id: "comms",
      title: "Signals in every format",
      statistic: commsExtras[0]?.replace(/[^0-9]/g, "").concat(" signals"),
      subtitle: commsExtras.join(" · "),
      description: data.faxReceived
        ? "Seriously? Still rocking fax machines? Your PBX humored every retro request."
        : "SMS kept the chatter flowing beyond calls — but hey, at least you didn't go full fax.",
      footer: "Slide 8",
      accent: gradients[(slides.length + 1) % gradients.length],
      animated: true,
      animationDelay: 350,
    });
  }
  if (hourlyBars.some((bar) => bar.value > 0)) {
  slides.splice(slides.length - 1, 0, {
  id: "busiest-hour",
  title: "When the switchboard surged",
   subtitle: `Peak hour: ${data.busiestHour.hour}:00 with ${data.busiestHour.count} calls`,
    description: "This was the exact moment everyone rang at once.",
    bars: hourlyBars,
    barsLabel: "Calls per hour",
    footer: "Slide 6",
     accent: gradients[(slides.length + 3) % gradients.length],
       animated: true,
        animationDelay: 380,
     });
  }
  if (longestCallDescription) {
    slides.splice(3, 0, {
      id: "longest-call",
      title: "The marathon call",
      statistic: `${formatNumber(longestCallDescription.minutes)} min`,
      subtitle: longestCallDescription.contact ? `with ${longestCallDescription.contact}` : undefined,
      description: "Deep-dive conversation of the year",
      footer: "Slide 4",
      accent: gradients[(slides.length + 2) % gradients.length],
      animated: true,
      animationDelay: 320,
    });
  }

  return slides;
};

const formatter = Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const formatNumber = (value: number) => formatter.format(value);
