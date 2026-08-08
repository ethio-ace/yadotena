"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Mail, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password,
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        setError("Invalid email or password. Please verify your credentials.");
      } else {
        const session = await getSession();
        const role = (session?.user as any)?.role;
        
        if (role === "WAITER") {
          router.push("/dashboard");
        } else if (role === "KITCHEN") {
          router.push("/dashboard/kitchen");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border shadow-2xl rounded-3xl overflow-hidden bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black shadow-xl shadow-primary/30 mb-3 animate-bounce duration-1000">
            🥛
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Yadotena Milk & Foods
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
            Staff & Operations Portal • Sign in to access your floor console
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in shake duration-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="email">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. manager@yadotena.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl h-11 pl-10 text-xs bg-muted/40 border-muted"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter account password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl h-11 pl-10 text-xs bg-muted/40 border-muted"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-2xl font-black text-xs shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all mt-2" 
              disabled={loading}
            >
              {loading ? "Signing in to Console..." : "Sign in to Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center pt-2 pb-8 border-t border-border/50 bg-muted/20 gap-2 text-xs text-muted-foreground">
          <p className="text-[11px]">Visiting as a customer?</p>
          <Link 
            href="/menu?table=t1" 
            className="hover:underline text-primary font-black flex items-center gap-1.5 bg-primary/10 px-4 py-2 rounded-xl"
          >
            <span>📱 Order from Table Stand (QR Demo)</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
