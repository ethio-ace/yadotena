"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { resolveCafeFacts } from "@/lib/cafe-facts";
import { parseDigitalMethods, cashEnabled } from "@/lib/checkout-payment";
import { LandingHero } from "@/components/landing/LandingHero";
import { HowToOrder } from "@/components/landing/HowToOrder";
import { MenuHighlights } from "@/components/landing/MenuHighlights";
import { OpsSignals } from "@/components/landing/OpsSignals";
import { CafeDetails } from "@/components/landing/CafeDetails";
import { StaffMap } from "@/components/landing/StaffMap";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.settings.getPublic(),
    staleTime: 60_000,
  });
  const cafe = resolveCafeFacts(settings);

  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
    staleTime: 60_000,
  });

  const acceptingOrders = settings?.accepting_orders !== false;
  const digitalMethods = parseDigitalMethods(settings);
  const showCash = cashEnabled(settings);
  const digitalOn = settings?.digital_enabled !== false;

  return (
    <>
      <LandingHero />
      <HowToOrder />
      <MenuHighlights items={menu} />
      <OpsSignals
        acceptingOrders={acceptingOrders}
        cashEnabled={showCash}
        digitalEnabled={digitalOn}
        digitalMethods={digitalMethods}
      />
      <CafeDetails {...cafe} />
      <StaffMap />
      <LandingFooter {...cafe} />
    </>
  );
}
