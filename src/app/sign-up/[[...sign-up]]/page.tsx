import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthUnavailable } from "@/components/auth-unavailable";
import { SiteHeader } from "@/components/site-header";
import { isAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  const enabled = isAuthConfigured();
  return (
    <>
      <SiteHeader />
      <main className="auth-page shell">
        {enabled ? <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" /> : <AuthUnavailable />}
      </main>
    </>
  );
}
