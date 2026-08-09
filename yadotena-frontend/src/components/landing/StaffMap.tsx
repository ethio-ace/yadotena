import {
  ArrowUpRight,
  ChefHat,
  ClipboardCheck,
  Settings2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const staffRoles: {
  role: string;
  blurb: string;
  icon: LucideIcon;
}[] = [
  {
    role: "Owner",
    blurb: "Settings, staff, expenses, and full ops oversight",
    icon: Settings2,
  },
  {
    role: "Manager",
    blurb: "Payments, menu ops, and day-to-day control",
    icon: ClipboardCheck,
  },
  {
    role: "Waiter",
    blurb: "Tables, floor orders, and service requests",
    icon: Utensils,
  },
  {
    role: "Kitchen",
    blurb: "Prep queue and order status",
    icon: ChefHat,
  },
];

export function StaffMap() {
  return (
    <section className="bg-[#141910] px-6 py-20 text-[#f4efe4] sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-5xl tracking-[-0.03em] sm:text-6xl">
            How the cafe runs
          </h2>
          <p className="mt-5 text-base leading-7 text-[#f4efe4]/72 sm:text-lg">
            Staff enter with phone and PIN. Pick your seat on the floor.
          </p>
        </div>

        <div className="mt-12 grid border-l border-t border-[#f4efe4]/12 sm:grid-cols-2 lg:grid-cols-4">
          {staffRoles.map(({ role, blurb, icon: Icon }) => (
            <Link
              key={role}
              href="/login"
              className="group relative min-h-64 border-b border-r border-[#f4efe4]/12 p-7 transition-colors duration-300 hover:bg-[#e8b84a] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e8b84a] sm:min-h-72"
            >
              <Icon
                className="size-7 text-[#e8b84a] transition-colors group-hover:text-[#141910]"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="absolute inset-x-7 bottom-7">
                <span className="flex items-end justify-between gap-4">
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-3xl tracking-tight">
                      {role}
                    </span>
                    <span className="mt-3 block text-sm leading-6 text-[#f4efe4]/68 transition-colors group-hover:text-[#141910]/80">
                      {blurb}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="mb-1 size-5 shrink-0 text-[#e8b84a] transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#141910]"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
