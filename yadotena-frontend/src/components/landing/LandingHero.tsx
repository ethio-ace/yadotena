"use client";

import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/cafe-facts";
import { cn } from "@/lib/utils";

const primaryCtaClass = cn(
  "inline-flex h-12 items-center justify-center rounded-full bg-[#e8b84a] px-6 text-sm font-semibold text-[#1a2118]",
  "shadow-[0_14px_40px_rgba(232,184,74,0.28)] transition-colors hover:bg-[#f0c45c]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2118]",
);

const secondaryCtaClass = cn(
  "inline-flex h-12 items-center justify-center rounded-full border border-[#f4efe4]/45 bg-[#f4efe4]/10 px-6 text-sm font-medium text-[#f4efe4]",
  "backdrop-blur-sm transition-colors hover:bg-[#f4efe4]/18",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2118]",
);

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#1a2118] text-[#f4efe4]">
      <Image
        src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2400&q=80"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(105deg,rgba(26,33,24,0.92)_18%,rgba(26,33,24,0.72)_48%,rgba(26,33,24,0.45)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(232,184,74,0.22),transparent_42%)]"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl items-end px-6 pb-20 pt-28 sm:items-center sm:px-10 lg:px-16">
        <div className="max-w-3xl">
          <motion.h1
            initial={{ opacity: 1, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="font-[family-name:var(--font-display)] text-5xl leading-[0.94] tracking-[-0.03em] text-balance sm:text-6xl md:text-7xl lg:text-[5.25rem]"
          >
            {BRAND_NAME}
          </motion.h1>

          <motion.div
            initial={{ opacity: 1, filter: "blur(0px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-7 max-w-xl sm:mt-8"
          >
            <p className="text-lg font-medium tracking-tight text-[#e8b84a] sm:text-xl">
              {BRAND_TAGLINE}
            </p>
            <p className="mt-3 max-w-lg text-base leading-7 text-[#f4efe4]/85 sm:text-lg">
              Dairy and kitchen plates — order at your table, take away, shop
              retail, or have it delivered.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:flex-wrap"
          >
            <Link href="/menu" className={primaryCtaClass}>
              View menu
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
            <Link href="/shop" className={secondaryCtaClass}>
              Retail shop
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-[#f4efe4]/75 transition-colors hover:text-[#e8b84a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a] focus-visible:ring-offset-4 focus-visible:ring-offset-[#1a2118]"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
              Staff portal
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
