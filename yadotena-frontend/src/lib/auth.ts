import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const rawBase = (process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com").replace(/\/+$/, "");
const API_BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "staff@yadotena.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();
          const user = data.user;

          if (user && user.status === "ACTIVE") {
            const tokenStr = data.token || data.access || "";
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              // The backend issues CHEF for kitchen staff; the frontend models
              // the kitchen role as KITCHEN. Normalize at the boundary so every
              // downstream role check (layout, routing, chrome) treats both
              // identically — exactly as the backend middleware does.
              role: user.role === "CHEF" ? "KITCHEN" : user.role,
              accessToken: tokenStr,
            };
          }
          
          return null;
        } catch (error) {
          console.error("Login API Error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as any;
        session.user.id = token.id as string;
        (session as any).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
