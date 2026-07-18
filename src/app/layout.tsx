import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://setupwith.vercel.app"),
  title: {
    default: "SetupWith — Set up anything with Codex",
    template: "%s — SetupWith",
  },
  description:
    "Purpose-built Codex setup prompts for hundreds of popular apps, AI tools, games, entertainment services, workspaces, browsers, and devices.",
  applicationName: "SetupWith",
  keywords: ["Codex", "app setup", "game launcher", "entertainment apps", "AI tools", "developer tools", "automation"],
  openGraph: {
    type: "website",
    siteName: "SetupWith",
    title: "SetupWith — Set up anything with Codex",
    description: "Hundreds of official app sources. Guided bundles. One reusable context profile.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
