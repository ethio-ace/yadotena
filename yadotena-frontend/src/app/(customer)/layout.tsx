"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Receipt, Search, Camera } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { CustomerDineInProvider, useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { CustomerTableBanner } from "@/components/customer/CustomerTableBanner";
import { TablePickerModal } from "@/components/customer/TablePickerModal";
import { CustomerDineInCart } from "@/components/customer/CustomerDineInCart";
import { QRScannerModal } from "@/components/customer/QRScannerModal";

function CustomerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsQRScannerOpen } = useCustomerDineIn();

  const [trackOpen, setTrackOpen] = useState(false);
  const [trackValue, setTrackValue] = useState("");

  const submitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const number = trackValue.trim();
    if (!number) return;
    setTrackOpen(false);
    setTrackValue("");
    router.push(`/order/${encodeURIComponent(number)}`);
  };

  return (
    <>
      {/* Table Banner */}
      <CustomerTableBanner />

      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/menu" className="flex items-center gap-2.5 group">
            <img
              src="/icon.svg"
              alt="Yadotena logo"
              className="h-10 w-10 rounded-2xl shadow-md shadow-primary/20 group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="font-black text-base md:text-lg text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                Yadotena <span className="text-primary text-xs font-bold block sm:inline">Milk & Foods</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Artisanal Kitchen & Fresh Store
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/menu">
            <Button
              variant={pathname === "/menu" ? "default" : "ghost"}
              size="sm"
              className={`rounded-full text-xs font-black h-9 px-4 gap-1.5 transition-all ${
                pathname === "/menu" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Digital Menu</span>
            </Button>
          </Link>

          <Link href="/shop">
            <Button
              variant={pathname === "/shop" ? "default" : "ghost"}
              size="sm"
              className={`rounded-full text-xs font-black h-9 px-4 gap-1.5 transition-all ${
                pathname === "/shop" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🛒 Shop Store</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-bold h-9 px-3 gap-1 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setIsQRScannerOpen(true)}
            title="Scan QR Code"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Scan QR</span>
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

          {/* Track Order by number */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold h-9 px-3.5 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setTrackOpen((o) => !o)}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Track Order</span>
            </Button>

            {trackOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTrackOpen(false)} />
                <form
                  onSubmit={submitTrack}
                  className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border rounded-2xl shadow-2xl p-3 space-y-2 animate-in zoom-in-95 fade-in duration-150"
                >
                  <p className="text-xs font-black text-foreground">Track your order</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Enter the ticket number from your receipt — no account needed.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={trackValue}
                      onChange={(e) => setTrackValue(e.target.value)}
                      placeholder="e.g. 84K2M1"
                      autoFocus
                      className="h-9 rounded-xl text-sm font-medium"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>

          <ThemeToggle />
        </div>
      </header>
    </>
  );
}

function GlobalCustomerModals() {
  const { isQRScannerOpen, setIsQRScannerOpen } = useCustomerDineIn();

  return (
    <>
      <TablePickerModal />
      <CustomerDineInCart />
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />
    </>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerDineInProvider>
      <div className="min-h-screen bg-background relative shadow-2xl flex flex-col">
        <CustomerHeader />
        
        {/* Global Modals */}
        <GlobalCustomerModals />

        {/* Main Content Area */}
        <main className="flex-1 pb-20 sm:pb-8">
          {children}
        </main>
      </div>
    </CustomerDineInProvider>
  );
}
