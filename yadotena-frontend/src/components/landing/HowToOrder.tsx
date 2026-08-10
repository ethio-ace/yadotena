import { Package, QrCode, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    title: "At the cafe",
    body: "Scan a table QR to open the menu for that table and pay after you dine.",
    icon: QrCode,
    href: "/menu?table=d0000000-0000-0000-0000-000000000004",
    linkLabel: "Try Table 04",
  },
  {
    title: "Browse anywhere",
    body: "Open the kitchen menu without a table. Pickup and delivery wait for payment; dine-in can pay later.",
    icon: UtensilsCrossed,
    href: "/menu",
    linkLabel: "View menu",
  },
  {
    title: "Retail shop",
    body: "Buy bottled milk and pantry packs from the shop — pickup or delivery, never mixed with kitchen tickets.",
    icon: Package,
    href: "/shop",
    linkLabel: "Open shop",
  },
] as const;

export function HowToOrder({ acceptingOrders = true }: { acceptingOrders?: boolean }) {
  return (
    <section className="bg-[#f4efe4] px-6 py-20 text-[#1a2118] sm:px-10 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
          How to order
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#1a2118]/75">
          Same live menu for guests at the table and guests ordering from
          elsewhere — kitchen menu and retail shop stay separate at checkout.
        </p>
        {!acceptingOrders && (
          <p className="mt-4 text-sm font-semibold text-[#7a5414]">
            Ordering is paused right now. You can still browse the menu and shop.
          </p>
        )}

        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {steps.map(({ title, body, icon: Icon, href, linkLabel }) => (
            <div key={title} className="relative">
              <Icon
                className="size-7 text-[#9a6b1f]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-tight">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#1a2118]/75">{body}</p>
              <Link
                href={href}
                className="mt-5 inline-block text-sm font-semibold text-[#7a5414] underline decoration-[#e8b84a] underline-offset-4 transition-colors hover:text-[#1a2118] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b84a]"
              >
                {linkLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
