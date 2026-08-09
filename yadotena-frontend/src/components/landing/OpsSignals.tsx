interface OpsSignalsProps {
  acceptingOrders: boolean;
  cashEnabled: boolean;
  digitalEnabled: boolean;
  digitalMethods: string[];
}

export function OpsSignals({
  acceptingOrders,
  cashEnabled,
  digitalEnabled,
  digitalMethods,
}: OpsSignalsProps) {
  const methods: string[] = [];
  if (cashEnabled) methods.push("Cash");
  if (digitalEnabled) {
    if (digitalMethods.length > 0) methods.push(...digitalMethods);
    else methods.push("Digital transfer");
  }

  return (
    <section className="border-y border-[#1a2118]/10 bg-[#ebe4d6] px-6 py-14 text-[#1a2118] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            Ordering status
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#1a2118]/75">
            Live from cafe settings — not marketing copy.
          </p>
        </div>

        <dl className="grid gap-6 sm:grid-cols-2 sm:gap-10">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#1a2118]/55">
              Accepting orders
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {acceptingOrders ? "Yes" : "Paused"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#1a2118]/55">
              Payment methods
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {methods.length > 0 ? methods.join(" · ") : "Ask staff"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
