import { MapPin, Phone } from "lucide-react";

interface CafeDetailsProps {
  phone: string;
  address: string;
  displayName: string;
}

export function CafeDetails({
  phone,
  address,
  displayName,
}: CafeDetailsProps) {
  if (!phone && !address) {
    return null;
  }

  return (
    <section className="bg-[#f4efe4] px-6 py-20 text-[#1a2118] sm:px-10 sm:py-24 lg:px-16">
      <div className="mx-auto grid max-w-7xl gap-12 border-t border-[#1a2118]/12 pt-14 md:grid-cols-[1fr_1.1fr] md:items-end md:gap-16">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-5xl tracking-[-0.03em] sm:text-6xl">
            Visit us
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[#1a2118]/75">
            Contact details from cafe settings for {displayName}.
          </p>
        </div>

        <address className="grid gap-8 not-italic sm:grid-cols-2">
          {address ? (
            <div className="flex items-start gap-4">
              <MapPin
                className="mt-1 size-5 shrink-0 text-[#9a6b1f]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold">Address</p>
                <p className="mt-1 leading-7 text-[#1a2118]/8">{address}</p>
              </div>
            </div>
          ) : null}

          {phone ? (
            <div className="flex items-start gap-4">
              <Phone
                className="mt-1 size-5 shrink-0 text-[#9a6b1f]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold">Phone</p>
                <a
                  href={`tel:${phone}`}
                  className="mt-1 inline-block leading-7 text-[#1a2118]/8 underline decoration-[#e8b84a] underline-offset-4 transition-colors hover:text-[#7a5414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
                >
                  {phone}
                </a>
              </div>
            </div>
          ) : null}
        </address>
      </div>
    </section>
  );
}
