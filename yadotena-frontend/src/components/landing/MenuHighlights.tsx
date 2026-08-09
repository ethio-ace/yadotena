import Link from "next/link";
import { formatETB } from "@/lib/currency";
import type { MenuItem } from "@/types";

interface MenuHighlightsProps {
  items: MenuItem[];
}

export function MenuHighlights({ items }: MenuHighlightsProps) {
  const highlights = items.filter((i) => i.available !== false).slice(0, 6);

  if (highlights.length === 0) {
    return (
      <section className="bg-[#1a2118] px-6 py-20 text-[#f4efe4] sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
            From the kitchen
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#f4efe4]/75">
            Menu highlights will appear here when the kitchen publishes dishes.
          </p>
          <Link
            href="/menu"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-[#e8b84a] px-5 text-sm font-semibold text-[#1a2118] transition-colors hover:bg-[#f0c45c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
          >
            Open full menu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#1a2118] px-6 py-20 text-[#f4efe4] sm:px-10 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
              From the kitchen
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#f4efe4]/75">
              A few dishes from today&apos;s public menu — prices as listed.
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex h-11 shrink-0 items-center rounded-full border border-[#f4efe4]/35 px-5 text-sm font-medium text-[#f4efe4] transition-colors hover:border-[#e8b84a] hover:text-[#e8b84a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
          >
            Full menu
          </Link>
        </div>

        <ul className="mt-12 divide-y divide-[#f4efe4]/15 border-y border-[#f4efe4]/15">
          {highlights.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-xl tracking-tight sm:text-2xl">
                  {item.name}
                </p>
                {item.description ? (
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#f4efe4]/65 line-clamp-2">
                    {item.description}
                  </p>
                ) : null}
                {item.category ? (
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#e8b84a]/90">
                    {item.category}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-base font-semibold tabular-nums text-[#e8b84a]">
                {formatETB(item.price)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
