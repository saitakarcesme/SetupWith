import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AuthProviderBoundary } from "@/components/auth-provider-boundary";
import { isAuthConfigured } from "@/lib/auth-config";
import "./globals.css";

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
  const authEnabled = isAuthConfigured();

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body>
        <AuthProviderBoundary enabled={authEnabled}>{children}</AuthProviderBoundary>
      </body>
    </html>
  );
}
