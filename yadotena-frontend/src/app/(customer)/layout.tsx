"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, BookOpen } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background relative shadow-2xl flex flex-col">
      {/* Public Digital Menu & Store Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
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

          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

          <Link href="/login">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full text-xs font-bold h-9 px-3.5 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Staff Portal</span>
            </Button>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
