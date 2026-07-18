"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apps } from "@/data/apps";
import { isAuthConfigured } from "@/lib/auth-config";
import {
  MAX_SAVED_PACKAGES,
  packageInputSchema,
  type StoredPackage,
} from "@/lib/custom-packages";
import {
  getUserPackages,
  PackageStorageLimitError,
  replaceUserPackages,
} from "@/lib/package-store";

export interface PackageActionState {
  error: string;
}

export const initialPackageActionState: PackageActionState = { error: "" };

function readPackageInput(formData: FormData) {
  const rawSlugs = String(formData.get("appSlugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  return packageInputSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    instruction: String(formData.get("instruction") ?? ""),
    appSlugs: rawSlugs,
  });
}

export async function createPackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  if (!isAuthConfigured()) return { error: "Account storage is not configured yet." };

  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in?redirect_url=/packages/new");

  const parsed = readPackageInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the package details." };

  const catalogSlugs = new Set(apps.map((app) => app.slug));
  if (parsed.data.appSlugs.some((slug) => !catalogSlugs.has(slug))) {
    return { error: "One or more selected apps are no longer in the verified catalog." };
  }

  const packages = await getUserPackages(userId);
  if (packages.length >= MAX_SAVED_PACKAGES) {
    return { error: `Your library can hold up to ${MAX_SAVED_PACKAGES} saved packages.` };
  }

  const normalizedName = parsed.data.name.toLocaleLowerCase("en");
  if (packages.some((item) => item.name.toLocaleLowerCase("en") === normalizedName)) {
    return { error: "A package with this name already exists." };
  }

  const now = new Date().toISOString();
  const newPackage: StoredPackage = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await replaceUserPackages(userId, [...packages, newPackage]);
  } catch (error) {
    if (error instanceof PackageStorageLimitError) {
      return { error: "This library is full. Remove a package or shorten its notes before saving another." };
    }
    return { error: "The package could not be saved. Please try again." };
  }
  revalidatePath("/account");
  redirect(`/account?created=${encodeURIComponent(newPackage.id)}`);
}

export async function deletePackageAction(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) return;
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in?redirect_url=/account");

  const packageId = String(formData.get("packageId") ?? "");
  if (!packageId || packageId.length > 80) return;

  const packages = await getUserPackages(userId);
  const nextPackages = packages.filter((item) => item.id !== packageId);
  if (nextPackages.length === packages.length) return;

  await replaceUserPackages(userId, nextPackages);
  revalidatePath("/account");
}
