"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { PackagePlus, UserRoundPlus } from "lucide-react";
import { useAuthConfigured } from "@/components/auth-provider-boundary";

interface HeaderAccountActionsProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function HeaderAccountActions({ mobile = false, onNavigate }: HeaderAccountActionsProps) {
  const enabled = useAuthConfigured();
  const className = mobile ? "mobile-account-link" : "header-account-link";

  if (!enabled) {
    return (
      <Link className={className} href="/packages/new" onClick={onNavigate}>
        Build package
        <PackagePlus aria-hidden="true" size={15} />
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Link className={className} href="/sign-up" onClick={onNavigate}>
          Create account
          <UserRoundPlus aria-hidden="true" size={15} />
        </Link>
      </Show>
      <Show when="signed-in">
        <Link className={className} href="/account" onClick={onNavigate}>My packages</Link>
        <span className={mobile ? "mobile-user-button" : "header-user-button"}>
          <UserButton />
        </span>
      </Show>
    </>
  );
}
