import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

/** Sesi login berlaku 10 menit; setelah itu pengguna harus masuk lagi. */
const TEN_MINUTES = 10 * 60;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: TEN_MINUTES },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const username = String(credentials.username).trim().toLowerCase();
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
        return { id: u.id, username: u.username, isAdmin: u.isAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username ?? undefined;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
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
