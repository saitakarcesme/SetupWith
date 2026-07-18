"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { deletePackageAction } from "@/app/account/packages/actions";

export interface PackageLibraryItem {
  id: string;
  name: string;
  description: string;
  appNames: string[];
  prompt: string;
  updatedAt: string;
}

export function PackageLibrary({ items }: { items: PackageLibraryItem[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPrompt(item: PackageLibraryItem) {
    await navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  if (items.length === 0) {
    return (
      <div className="package-library-empty">
        <span>00</span>
        <h2>No saved packages yet.</h2>
        <p>Choose at least two apps and save the coordinated setup to this account.</p>
        <Link href="/packages/new"><Plus aria-hidden="true" size={16} /> Create a package</Link>
      </div>
    );
  }

  return (
    <div className="package-library-grid">
      {items.map((item, index) => (
        <article className="package-library-card" key={item.id}>
          <div className="package-library-index">{String(index + 1).padStart(2, "0")}</div>
          <div>
            <span>{item.appNames.length} APPS / PRIVATE</span>
            <h2>{item.name}</h2>
            <p>{item.description || "A coordinated SetupWith package."}</p>
            <ul>
              {item.appNames.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
          <div className="package-library-actions">
            <button aria-label={`Copy ${item.name} prompt`} onClick={() => copyPrompt(item)} type="button">
              {copiedId === item.id ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
            </button>
            <form
              action={deletePackageAction}
              onSubmit={(event) => {
                if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input name="packageId" type="hidden" value={item.id} />
              <button aria-label={`Delete ${item.name}`} type="submit"><Trash2 aria-hidden="true" size={17} /></button>
            </form>
          </div>
          <time dateTime={item.updatedAt}>
            {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.updatedAt))}
          </time>
        </article>
      ))}
    </div>
  );
}
