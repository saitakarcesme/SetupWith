import Image from "next/image";
import { getLogoUrl, type CatalogEntry } from "@/data/apps";

interface AppLogoProps {
  app: CatalogEntry;
  size?: number;
  className?: string;
  priority?: boolean;
}

export function AppLogo({ app, size = 48, className = "", priority = false }: AppLogoProps) {
  return (
    <Image
      className={`app-logo ${className}`}
      src={getLogoUrl(app)}
      alt={`${app.name} logo`}
      width={size}
      height={size}
      priority={priority}
      unoptimized
    />
  );
}
