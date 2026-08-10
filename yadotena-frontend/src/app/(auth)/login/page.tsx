"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Lock, Phone, AlertCircle } from "lucide-react";
import { BRAND_NAME } from "@/lib/cafe-facts";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        phone: phone.trim(),
        pin: pin.trim(),
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        setError("Invalid phone or PIN.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (role === "KITCHEN") router.push("/dashboard/kitchen");
      else router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border shadow-2xl rounded-3xl overflow-hidden bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 mb-3 animate-in zoom-in-95 duration-500">
            <Lock className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {BRAND_NAME}
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
            Staff portal — sign in with phone + PIN
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="phone">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 rounded-xl h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="pin">
                PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pl-10 rounded-xl h-11"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl h-11 font-bold" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-2 text-sm text-muted-foreground pb-8">
          <Link href="/" className="hover:underline text-muted-foreground font-semibold text-xs">
            ← Back to home
          </Link>
          <Link href="/menu" className="hover:underline text-primary font-semibold text-xs">
            Browse menu
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
