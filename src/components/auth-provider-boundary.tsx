"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { createContext, useContext, type ReactNode } from "react";

const AuthConfiguredContext = createContext(false);

interface AuthProviderBoundaryProps {
  children: ReactNode;
  enabled: boolean;
}

export function AuthProviderBoundary({ children, enabled }: AuthProviderBoundaryProps) {
  const content = (
    <AuthConfiguredContext.Provider value={enabled}>
      {children}
    </AuthConfiguredContext.Provider>
  );

  if (!enabled) return content;

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/account"
      signUpFallbackRedirectUrl="/packages/new"
    >
      {content}
    </ClerkProvider>
  );
}

export function useAuthConfigured(): boolean {
  return useContext(AuthConfiguredContext);
}
