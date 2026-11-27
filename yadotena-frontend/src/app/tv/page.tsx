import type { Metadata } from "next";
import { OrderBoardScreen } from "@/components/tv/OrderBoardScreen";

export const metadata: Metadata = {
  title: "Order board",
  robots: { index: false, follow: false },
};

/** Café TV: live order progress for guests in the room. Public, no login. */
export default function TvPage() {
  return <OrderBoardScreen />;
}
