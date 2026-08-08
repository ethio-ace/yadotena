"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  { label: "Owner", phone: "0900000001", role: "OWNER" },
  { label: "Manager", phone: "0900000002", role: "MANAGER" },
  { label: "Waiter", phone: "0900000003", role: "WAITER" },
  { label: "Kitchen", phone: "0900000004", role: "KITCHEN" },
] as const;

const DEMO_TABLE_ID = "d0000000-0000-0000-0000-000000000004";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        phone,
        pin,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid phone or PIN");
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role as string | undefined;

      if (role === "KITCHEN") router.push("/dashboard/kitchen");
      else if (role === "WAITER") router.push("/dashboard");
      else router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-muted-foreground/15 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-lg shadow-primary/25 mb-2">
            🥛
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Yadotena Milk & Foods</CardTitle>
          <CardDescription className="text-xs font-medium">
            Staff portal — phone + PIN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="phone">
                Phone
              </label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="0900000001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pin">
                PIN
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Accounts (PIN 1234)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.phone}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setPhone(acc.phone);
                    setPin("1234");
                  }}
                >
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          <a
            href={`/menu?table=${DEMO_TABLE_ID}`}
            className="hover:underline text-primary font-semibold flex items-center gap-1.5"
          >
            <span>Continue as Customer (Table 04 QR Demo)</span>
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
