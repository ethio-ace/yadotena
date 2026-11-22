import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Role } from "@/types";
import { API_BASE } from "./config";

/** Keep in sync with API_TOKEN_TTL_HOURS on the Django backend (default 12h). */
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "staff@hilif.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email.trim().toLowerCase(),
              password: credentials.password,
            }),
          });
          if (!res.ok) return null;

          const data = await res.json();
          const user = data.user;
          if (!user || user.status !== "ACTIVE" || !data.token) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            // Older backends issued CHEF for kitchen staff; the UI models it as KITCHEN.
            role: (user.role === "CHEF" ? "KITCHEN" : user.role) as Role,
            accessToken: data.token as string,
            accessTokenExpires: data.expiresAt
              ? Date.parse(data.expiresAt)
              : Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
          };
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
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
      }
      if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        token.error = "TokenExpired";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      // Revoke the API token on the server too.
      if (!token?.accessToken) return;
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });
      } catch {
        // Best effort: the token also expires on its own.
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};
