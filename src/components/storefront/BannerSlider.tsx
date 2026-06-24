"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
  id: string; title: string; subtitle?: string | null; buttonText?: string | null;
  buttonLink?: string | null; imageUrl?: string | null; bgColor: string; textColor: string;
}

export default function StorefrontBannerSlider({ banners, slug }: { banners: Banner[]; slug: string }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number, dir: "next" | "prev" = "next") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 400);
  }, [animating]);

  const next = useCallback(() => go((current + 1) % banners.length, "next"), [current, banners.length, go]);
  const prev = useCallback(() => go((current - 1 + banners.length) % banners.length, "prev"), [current, banners.length, go]);

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, next]);

  // Pause on hover
  function pauseTimer() { if (timerRef.current) clearInterval(timerRef.current); }
  function resumeTimer() {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(next, 5000);
  }

  // Swipe support
  const touchStart = useRef<number>(0);
  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (delta > 50) next();
    else if (delta < -50) prev();
  }

  const resolveLink = (link: string | null | undefined): string => {
    if (!link) return `/store/${slug}/search`;
    if (link.startsWith("http")) return link;
    if (link.startsWith("/store/")) return link;
    return `/store/${slug}${link.startsWith("/") ? link : "/" + link}`;
  };

  const b = banners[current];

  return (
    <section
      className="relative overflow-hidden select-none"
      style={{ minHeight: "460px" }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Slides ── */}
      {banners.map((banner, idx) => {
        const isActive = idx === current;
        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              isActive
                ? "opacity-100 translate-x-0 z-10"
                : animating && direction === "next" && idx === (current - 1 + banners.length) % banners.length
                ? "opacity-0 -translate-x-full z-0"
                : animating && direction === "prev" && idx === (current + 1) % banners.length
                ? "opacity-0 translate-x-full z-0"
                : "opacity-0 z-0"
            }`}
            style={{ minHeight: "460px" }}
          >
            {/* Background color fallback */}
            <div className="absolute inset-0" style={{ backgroundColor: banner.bgColor }} />

            {/* Full-bleed image */}
            {banner.imageUrl && (
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className="object-cover"
                unoptimized
                priority={idx === 0}
              />
            )}

            {/* Gradient overlay for text readability */}
            <div className={`absolute inset-0 ${
              banner.imageUrl
                ? "bg-gradient-to-r from-black/65 via-black/40 to-black/10"
                : "bg-gradient-to-br from-black/30 to-transparent"
            }`} />

            {/* Content */}
            <div className="relative z-10 flex items-center h-full min-h-[460px] px-8 md:px-16 lg:px-24">
              <div className="max-w-xl">
                <h1
                  className={`font-extrabold leading-tight mb-4 drop-shadow transition-all duration-500 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{
                    color: banner.imageUrl ? "#ffffff" : banner.textColor,
                    fontSize: "clamp(2rem, 5vw, 3.5rem)",
                    textShadow: banner.imageUrl ? "0 2px 12px rgba(0,0,0,0.5)" : undefined,
                  }}
                >
                  {banner.title}
                </h1>

                {banner.subtitle && (
                  <p
                    className={`text-lg md:text-xl mb-8 max-w-md leading-relaxed transition-all duration-500 delay-75 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                    style={{
                      color: banner.imageUrl ? "rgba(255,255,255,0.9)" : banner.textColor,
                      textShadow: banner.imageUrl ? "0 1px 8px rgba(0,0,0,0.4)" : undefined,
                    }}
                  >
                    {banner.subtitle}
                  </p>
                )}

                {banner.buttonText && (
                  <div className={`transition-all duration-500 delay-150 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <Link
                      href={resolveLink(banner.buttonLink)}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
                      style={
                        banner.imageUrl
                          ? { backgroundColor: "#ffffff", color: "#111827" }
                          : { backgroundColor: banner.textColor, color: banner.bgColor }
                      }
                    >
                      {banner.buttonText}
                      <span className="text-lg">→</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Navigation arrows ── */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
          </button>

          {/* ── Dot indicators + progress bar ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
            {/* Progress bar for current slide */}
            <div className="w-40 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                key={current}
                className="h-full bg-white rounded-full origin-left"
                style={{ animation: "progress-bar 5s linear forwards" }}
              />
            </div>
            {/* Dots */}
            <div className="flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > current ? "next" : "prev")}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? "w-7 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slide counter */}
          <div className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {current + 1} / {banners.length}
          </div>
        </>
      )}

      <style>{`
        @keyframes progress-bar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}
