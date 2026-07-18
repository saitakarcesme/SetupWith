import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export function AuthUnavailable() {
  return (
    <section className="auth-unavailable">
      <LockKeyhole aria-hidden="true" size={24} />
      <span className="eyebrow">ACCOUNT SERVICE</span>
      <h1>Account creation is not configured.</h1>
      <p>You can still create and copy a common multi-app prompt without an account.</p>
      <Link href="/packages/new">Open package builder <ArrowRight aria-hidden="true" size={16} /></Link>
    </section>
  );
}
