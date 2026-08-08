"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { mockUsers } from "@/mocks";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await signIn("credentials", {
        email,
        password: "password123", // Mock password
        redirect: false,
      });

      if (res?.error) {
        alert("Login failed");
      } else {
        const user = mockUsers.find((u) => u.email === email);
        if (user) {
          if (user.role === "CUSTOMER") router.push("/");
          else if (user.role === "WAITER") router.push("/waiter");
          else if (user.role === "KITCHEN") router.push("/kitchen");
          else router.push("/dashboard");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-muted-foreground/15 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-lg shadow-primary/25 mb-2">
            🥛
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Yadotena Milk & Foods</CardTitle>
          <CardDescription className="text-xs font-medium">Operations & Restaurant Management Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                defaultValue="password123" // Mock password is pre-filled
                required
              />
            </div>
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
                <span className="bg-card px-2 text-muted-foreground">
                  Demo Accounts
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("owner@demo.com")}>
                Owner
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("manager@demo.com")}>
                Manager
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("waiter@demo.com")}>
                Waiter
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("kitchen@demo.com")}>
                Kitchen
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          <a href="/menu?table=t4" className="hover:underline text-primary font-semibold flex items-center gap-1.5">
            <span>Continue as Customer (Table 04 QR Demo)</span>
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
