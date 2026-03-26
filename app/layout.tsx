import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FinanceAI — Personal finance tracker",
  description: "Track spending, scan receipts with OCR, and get AI-style insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans`}
      >
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
