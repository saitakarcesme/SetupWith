import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="not-found-page shell">
        <span>404</span>
        <div><p className="eyebrow">SETUP NOT FOUND</p><h1>This route has no recipe.</h1><Link href="/apps"><ArrowLeft size={15} aria-hidden="true" /> Return to all apps</Link></div>
      </main>
    </>
  );
}
