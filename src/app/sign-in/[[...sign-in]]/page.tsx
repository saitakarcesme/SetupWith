import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthUnavailable } from "@/components/auth-unavailable";
import { SiteHeader } from "@/components/site-header";
import { isAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  const enabled = isAuthConfigured();
  return (
    <>
      <SiteHeader />
      <main className="auth-page shell">
        {enabled ? <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" /> : <AuthUnavailable />}
      </main>
    </>
  );
}
