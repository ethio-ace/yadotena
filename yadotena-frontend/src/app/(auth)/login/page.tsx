"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { setStoredToken } from "@/lib/config";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Mail, AlertCircle, ArrowRight, UserCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  // Uncontrolled inputs: text typed before React hydrates (slow phones) is
  // kept by the browser; a controlled value would be reset to "" on hydrate.
  // False in the server HTML, true once React runs. Until then the submit
  // button stays disabled, so an early tap/Enter can't fall back to a native
  // form submit (which would drop the typed text or put it in the URL).
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";
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
        setError("Invalid email or password.");
      } else {
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (session?.accessToken) {
          setStoredToken(session.accessToken);
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

  // Dev-only shortcuts for the seeded demo accounts (seed_yadotena_data).
  // Never rendered in production: a public login page must not hint at passwords.
  const showDemoLogins = process.env.NODE_ENV !== "production";
  const DEMO_PASSWORD = "password123";
  const fillQuickDemo = (demoEmail: string) => {
    if (emailRef.current) emailRef.current.value = demoEmail;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      {/* Light by default (app-wide defaultTheme); staff can switch here. */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg border shadow-xl dark:shadow-2xl rounded-3xl overflow-hidden bg-card text-card-foreground">
        <div className="tibeb" aria-hidden="true" />
        <CardHeader className="text-center pb-2 pt-8 space-y-2">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
            <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
              <path d="M21 10c0-3.2 4-3.2 4-6.4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
              <path d="M33 10c0-3.2 4-3.2 4-6.4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
              <rect x="15" y="22" width="34" height="4.5" rx="2.25" fill="#fff"/>
              <path d="M17 25.5h30v6.5a11 11 0 0 1-11 11H28a11 11 0 0 1-11-11z" fill="#fff"/>
              <path d="M47 28.5h3.2a4.4 4.4 0 0 1 0 8.8H47" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
              <rect x="13" y="46.5" width="38" height="4.5" rx="2.25" fill="#e6a313"/>
            </svg>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">
            Hilif Staff & Operations Console
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground">
            Authorized Personnel Portal for Waiters, Chefs, Managers & Owners
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pt-4 pb-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in shake duration-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} method="post" className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/80">Staff Email or System Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="you@example.com"
                  ref={emailRef}
                  name="email"
                  autoComplete="username"
                  className="rounded-2xl h-12 pl-10 text-xs bg-background focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground/80">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Your password"
                  ref={passwordRef}
                  name="password"
                  autoComplete="current-password"
                  className="rounded-2xl h-12 pl-10 text-xs bg-background focus:ring-primary"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-black text-xs shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all mt-2"
              disabled={loading || !hydrated}
            >
              {loading ? "Authenticating Staff..." : "Sign in to Staff Station"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick demo logins — development only */}
          {showDemoLogins && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground text-center mb-2">
              ⚡ Dev only — demo accounts (password: <span className="text-primary font-black">{DEMO_PASSWORD}</span>)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("waiter@demo.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-background hover:bg-muted"
              >
                <span>🧑‍🍳 Waiter Console</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("kitchen@demo.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-background hover:bg-muted"
              >
                <span>🍳 Kitchen KDS</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("manager@demo.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-background hover:bg-muted"
              >
                <span>💼 Operations Manager</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillQuickDemo("owner@demo.com")}
                className="rounded-xl h-10 text-[11px] font-bold justify-start px-3 bg-background hover:bg-muted"
              >
                <span>👑 Executive Owner</span>
              </Button>
            </div>
          </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center pt-2 pb-6 border-t bg-muted/40 text-xs text-muted-foreground">
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
