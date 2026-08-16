import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/lib/auth-provider";
import QueryProvider from "@/lib/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AblySyncProvider } from "@/contexts/AblySyncProvider";
import { ThemeProvider } from "@/components/theme-provider";

const BRAND = "Yadotena Milk and Foods";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://yadotena.vercel.app"),
  title: {
    default: `${BRAND} | Fresh Dairy & Artisanal Kitchen`,
    template: `%s | ${BRAND}`,
  },
  description:
    "Yadotena Milk and Foods — pure farm-fresh dairy, artisan kitchen meals, coffee, teas, and over-the-counter retail goods.",
  applicationName: "Yadotena",
  keywords: [
    "Yadotena",
    "café POS",
    "fresh dairy",
    "Ethiopian coffee",
    "artisanal kitchen",
    "digital menu",
    "coffee shop",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: `${BRAND} | Fresh Dairy & Artisanal Kitchen`,
    description:
      "Explore farm-fresh dairy, artisan kitchen meals, coffee & teas, and retail goods from Yadotena.",
    type: "website",
    locale: "en_ET",
    siteName: BRAND,
    images: [{ url: "/icon.svg", width: 64, height: 64, alt: "Yadotena logo" }],
  },
  twitter: {
    card: "summary",
    title: `${BRAND} | Fresh Dairy & Artisanal Kitchen`,
    description: "Farm-fresh dairy, artisan kitchen meals, coffee & retail goods.",
    images: ["/icon.svg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <AblySyncProvider>
                {children}
              </AblySyncProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
