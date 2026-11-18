import type { Role } from "./index";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
    accessToken?: string;
    error?: "TokenExpired";
  }

  interface User {
    id: string;
    role: Role;
    accessToken?: string;
    accessTokenExpires?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    accessToken?: string;
    accessTokenExpires?: number;
    error?: "TokenExpired";
  }
}
