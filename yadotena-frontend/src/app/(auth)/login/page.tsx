"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Mail, AlertCircle, ArrowRight, UserCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password,
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        setError("Invalid staff credentials. Default PIN/Password is '1234'.");
      } else {
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        const accessToken = (session as { accessToken?: string } | null)?.accessToken;
        if (accessToken) {
          localStorage.setItem("token", accessToken);
        }

        setSuccess("Staff authorization verified! Loading dashboard...");
        
        if (role === "WAITER") {
          router.push("/dashboard/waiter");
        } else if (role === "CHEF" || role === "KITCHEN") {
          router.push("/dashboard/kitchen");
        } else if (role === "MANAGER") {
          router.push("/dashboard/manager");
        } else {
          router.push("/dashboard/owner");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("1234");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-lg border border-slate-800 shadow-2xl rounded-3xl overflow-hidden bg-slate-900/90 text-slate-50 backdrop-blur-md">
        <CardHeader className="text-center pb-2 pt-8 space-y-2">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
            <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
              <path d="M21 10c0-3.2 4-3.2 4-6.4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
              <path d="M33 10c0-3.2 4-3.2 4-6.4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
              <rect x="15" y="22" width="34" height="4.5" rx="2.25" fill="#fff"/>
              <path d="M17 25.5h30v6.5a11 11 0 0 1-11 11H28a11 11 0 0 1-11-11z" fill="#fff"/>
              <path d="M47 28.5h3.2a4.4 4.4 0 0 1 0 8.8H47" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
              <rect x="13" y="46.5" width="38" height="4.5" rx="2.25" fill="#fff" opacity="0.92"/>
            </svg>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">
            Yadotena Staff & Operations Console
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400">
            Authorized Personnel Portal for Waiters, Chefs, Managers & Owners
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pt-4 pb-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in shake duration-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Staff Email or System Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="e.g. waiter@yadotena.com, manager@yadotena.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl h-12 pl-10 text-xs bg-slate-800/80 border-slate-700 text-slate-100 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Security PIN / Password</label>
                <span className="text-[10px] font-semibold text-slate-400">Default PIN: 1234</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Enter staff security PIN..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl h-12 pl-10 text-xs bg-slate-800/80 border-slate-700 text-slate-100 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-black text-xs shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all mt-2"
              disabled={loading}
            >
              {loading ? "Authenticating Staff..." : "Sign in to Staff Station"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Staff Demo Account Buttons */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-slate-400 text-center mb-2">
              ⚡ Quick Demo Staff Station Login (Password: <span className="text-primary font-black">1234</span>)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("waiter@yadotena.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <span>🧑‍🍳 Waiter Console</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("chef@yadotena.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <span>🍳 Kitchen KDS</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("manager@yadotena.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <span>💼 Operations Manager</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("owner@yadotena.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <span>👑 Executive Owner</span>
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center pt-2 pb-6 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <p className="text-[11px]">Dine-In Customer Stand Menu?</p>
          <Link
            href="/menu?table=t3"
            className="hover:underline text-primary font-black flex items-center gap-1.5 mt-1 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>📱 Table QR Menu Stand</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
