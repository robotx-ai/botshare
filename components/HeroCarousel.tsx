"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Barlow_Condensed } from "next/font/google";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["normal"],
  display: "swap",
});

const slides = [
  { videoSrc: "https://res.cloudinary.com/dmrhtzqyx/video/upload/q_auto,f_auto/pepsi-bg.mp4", label: "Brand Promotion" },
  { videoSrc: "https://res.cloudinary.com/dmrhtzqyx/video/upload/q_auto,f_auto/paris-performance-bg.mp4", label: "Live Performance" },
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const advance = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % slides.length);
  }, []);

  const goTo = (index: number) => {
    if (index !== currentIndex) setCurrentIndex(index);
  };

  // When slide changes: reset & play the active video, pause & reset others
  useEffect(() => {
    slides.forEach((_, i) => {
      const video = videoRefs.current[i];
      if (!video) return;
      if (i === currentIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  return (
    <section className="relative -mt-28 min-h-[calc(100vh-112px)] overflow-hidden pt-28">
      {/* Background videos — always mounted, crossfade with opacity */}
      {slides.map((slide, i) => (
        <motion.video
          key={slide.videoSrc}
          ref={(el) => { videoRefs.current[i] = el; }}
          muted
          playsInline
          onEnded={() => { if (i === currentIndex) advance(); }}
          animate={{ opacity: i === currentIndex ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        >
          <source src={slide.videoSrc} type="video/mp4" />
        </motion.video>
      ))}

      {/* Gradient for text legibility */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content — centered */}
      <div className="relative z-10 flex min-h-[calc(100vh-112px)] items-center justify-center">
        <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 lg:px-12">
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Headline */}
            <h1
              className={`${barlow.className} text-[2.75rem] font-extrabold uppercase leading-none tracking-tight text-white sm:text-6xl lg:text-7xl`}
            >
              Book BotSharing US Services for
              {/* Animated service name — clip reveal */}
              <span className="mt-1 block overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentIndex}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-110%" }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="block text-neutral-300"
                  >
                    {slides[currentIndex].label}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* CTA */}
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition hover:bg-neutral-200"
            >
              Explore Services
            </Link>

            {/* Slide indicators */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-[2px] rounded-full transition-all duration-500 ${
                    i === currentIndex
                      ? "w-8 bg-white"
                      : "w-3 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
