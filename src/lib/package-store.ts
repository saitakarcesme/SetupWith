import { clerkClient } from "@clerk/nextjs/server";
import {
  PACKAGE_LIBRARY_BYTE_BUDGET,
  parseStoredPackages,
  type StoredPackage,
} from "@/lib/custom-packages";

const METADATA_KEY = "setupwithPackages";
const PRIVATE_METADATA_BYTE_BUDGET = 7_500;

export class PackageStorageLimitError extends Error {
  constructor() {
    super("This package library has reached its safe storage limit.");
    this.name = "PackageStorageLimitError";
  }
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export async function getUserPackages(userId: string): Promise<StoredPackage[]> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return parseStoredPackages(user.privateMetadata[METADATA_KEY]);
}

export async function replaceUserPackages(userId: string, packages: StoredPackage[]): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const packageMetadata = {
    version: 1,
    items: packages,
  };
  const nextPrivateMetadata = {
    ...user.privateMetadata,
    [METADATA_KEY]: packageMetadata,
  };

  if (
    byteLength(packageMetadata) > PACKAGE_LIBRARY_BYTE_BUDGET
    || byteLength(nextPrivateMetadata) > PRIVATE_METADATA_BYTE_BUDGET
  ) {
    throw new PackageStorageLimitError();
  }

  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      [METADATA_KEY]: packageMetadata,
    },
  });
}
