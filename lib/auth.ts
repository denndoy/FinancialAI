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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;

        const adminEnv = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        if (adminEnv && email === adminEnv) {
          await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
        }

        const u = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { id: true, email: true, isAdmin: true },
        });
        return { id: u.id, email: u.email, isAdmin: u.isAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
      }
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { email: true, isAdmin: true },
        });
        if (u) {
          token.email = u.email ?? undefined;
          token.isAdmin = u.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.email) session.user.email = token.email as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
