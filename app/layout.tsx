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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/fi-logo-transparent-16.png", sizes: "16x16", type: "image/png" },
      { url: "/fi-logo-transparent-32.png", sizes: "32x32", type: "image/png" },
      { url: "/fi-logo-transparent-192.png", sizes: "192x192", type: "image/png" },
      { url: "/fi-logo-transparent-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/fi-logo-transparent-180.png", sizes: "180x180", type: "image/png" }],
  },
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
