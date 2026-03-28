import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

/**
 * Sesi login persisten per device/browser agar pengguna tidak perlu login berulang.
 * Tetap ada batas waktu untuk keamanan.
 */
const TEN_MINUTES = 10 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: THIRTY_DAYS, updateAge: 24 * 60 * 60 },
  jwt: { maxAge: THIRTY_DAYS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const username = String(credentials.username).trim().toLowerCase();
        const rememberMe = String(credentials.rememberMe ?? "true") === "true";
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;

        const adminEnv = process.env.ADMIN_USERNAME?.toLowerCase().trim();
        if (adminEnv && username === adminEnv) {
          await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
        }

        const u = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { id: true, username: true, isAdmin: true },
        });
        return { id: u.id, username: u.username, isAdmin: u.isAdmin, rememberMe };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username ?? undefined;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
        token.rememberMe = Boolean((user as { rememberMe?: boolean }).rememberMe);
        const sessionAge = token.rememberMe ? THIRTY_DAYS : TEN_MINUTES;
        token.exp = Math.floor(Date.now() / 1000) + sessionAge;
      }
      if (typeof token.rememberMe === "undefined") {
        token.rememberMe = true;
      }
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { username: true, isAdmin: true },
        });
        if (u) {
          token.username = u.username;
          token.isAdmin = u.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.username) session.user.username = token.username as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
