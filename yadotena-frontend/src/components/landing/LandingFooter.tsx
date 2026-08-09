import Link from "next/link";

interface LandingFooterProps {
  phone: string;
  address: string;
  displayName: string;
}

export function LandingFooter({
  phone,
  address,
  displayName,
}: LandingFooterProps) {
  return (
    <footer className="border-t border-[#1a2118]/12 bg-[#f4efe4] px-6 py-10 text-[#1a2118] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            {displayName}
          </p>
          {(address || phone) && (
            <address className="mt-3 flex flex-col gap-1 text-sm leading-6 text-[#1a2118]/7 not-italic sm:flex-row sm:gap-3">
              {address ? <span>{address}</span> : null}
              {address && phone ? (
                <span aria-hidden="true" className="hidden text-[#9a6b1f] sm:inline">
                  /
                </span>
              ) : null}
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="transition-colors hover:text-[#7a5414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
                >
                  {phone}
                </a>
              ) : null}
            </address>
          )}
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm">
          <Link
            href="/menu"
            className="font-medium underline decoration-[#e8b84a] underline-offset-4 transition-colors hover:text-[#7a5414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
          >
            View menu
          </Link>
          <Link
            href="/shop"
            className="font-medium underline decoration-[#e8b84a] underline-offset-4 transition-colors hover:text-[#7a5414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
          >
            Retail shop
          </Link>
          <Link
            href="/login"
            className="font-medium underline decoration-[#e8b84a] underline-offset-4 transition-colors hover:text-[#7a5414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
          >
            Staff portal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
