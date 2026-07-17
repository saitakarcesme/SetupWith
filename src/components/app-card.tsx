import Link from "next/link";
import { ArrowUpRight, KeyRound } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import type { SetupApp } from "@/data/apps";

interface AppCardProps {
  app: SetupApp;
  compact?: boolean;
}

export function AppCard({ app, compact = false }: AppCardProps) {
  return (
    <Link
      className={`app-card ${compact ? "app-card-compact" : ""}`}
      href={`/${app.slug}`}
      style={{ "--app-accent": app.accent } as React.CSSProperties}
    >
      <div className="app-card-topline">
        <span>{String(app.index).padStart(3, "0")}</span>
        <span>{app.category}</span>
      </div>
      <div className="app-card-logo-wrap">
        <AppLogo app={app} size={compact ? 36 : 48} />
      </div>
      <div className="app-card-copy">
        <h3>{app.name}</h3>
        <p>{app.description}</p>
      </div>
      <div className="app-card-meta">
        <span>{app.installTime}</span>
        <span>{app.platforms.join(" · ")}</span>
        {app.secrets.length > 0 ? (
          <span className="app-card-secret">
            <KeyRound size={12} aria-hidden="true" /> {app.secrets.length}
          </span>
        ) : null}
        <ArrowUpRight className="app-card-arrow" size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}
