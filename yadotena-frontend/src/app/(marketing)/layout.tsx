import { Fraunces } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_NAME } from "@/lib/cafe-facts";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} flex min-h-screen flex-col bg-[#f4efe4]`}
    >
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 text-[#f4efe4] md:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a] focus-visible:ring-offset-4 focus-visible:ring-offset-[#1a2118] md:text-base"
        >
          {BRAND_NAME}
        </Link>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
