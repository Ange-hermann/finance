import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing credentials");
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.actif) {
            console.log("[Auth] User not found or inactive:", credentials.email);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.motDePasseHash);
          if (!isValid) {
            console.log("[Auth] Invalid password for:", credentials.email);
            return null;
          }

          console.log("[Auth] Login success:", credentials.email);
          return {
            id: user.id,
            name: user.nom,
            email: user.email,
            role: user.role,
          } as any;
        } catch (error) {
          console.error("[Auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
