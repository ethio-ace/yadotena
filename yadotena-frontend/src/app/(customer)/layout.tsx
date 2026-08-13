"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, BookOpen } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/20 relative shadow-2xl overflow-hidden flex flex-col">
      {/* Public Digital Menu Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              🥛
            </div>
            <div>
              <h1 className="font-black text-lg text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                Yadotena <span className="text-primary text-xs font-bold block sm:inline">Milk & Foods</span>
              </h1>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                Digital Menu Showcase • Artisanal Kitchen
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/menu">
            <Button 
              variant="default" 
              size="sm" 
              className="rounded-full text-xs font-extrabold h-8 px-3.5 shadow-md shadow-primary/20 gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Digital Menu</span>
            </Button>
          </Link>

          <Link href="/login">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full text-xs font-extrabold h-8 px-3.5 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Staff Login</span>
            </Button>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Notice Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-center text-xs font-bold text-primary flex items-center justify-center gap-2">
        <span>📜 Welcome to Yadotena! Browse our gourmet menu below — your floor waiter will take your order & settle your bill.</span>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
    </div>
  );
}
