"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { OpenSourceCategory, OpenSourceProjectCard } from "@/data/open-source";

type OpenSourceCategoryFilter = "All" | OpenSourceCategory;

interface OpenSourceExplorerProps {
  categories: readonly OpenSourceCategoryFilter[];
  projects: OpenSourceProjectCard[];
}

function getProjectLogoUrl(project: OpenSourceProjectCard): string {
  if (project.simpleIconSlug) {
    return `https://cdn.simpleicons.org/${project.simpleIconSlug}`;
  }

  const owner = project.repo.replace("https://github.com/", "").split("/")[0];
  return `https://github.com/${owner}.png?size=192`;
}

export function OpenSourceExplorer({ categories, projects }: OpenSourceExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<OpenSourceCategoryFilter>("All");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    const matchesCategory = category === "All" || project.category === category;
    const searchableText = [
      project.name,
      project.description,
      project.category,
      project.reason,
      project.repo,
    ].join(" ").toLowerCase();

    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });

  function resetFilters() {
    setQuery("");
    setCategory("All");
  }

  return (
    <div className="catalog-explorer">
      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search open-source projects</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${projects.length} open-source projects`}
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="catalog-count" aria-live="polite">
          <SlidersHorizontal size={15} aria-hidden="true" />
          {visibleProjects.length} repositories
        </div>
      </div>

      <div className="category-tabs" aria-label="Filter open-source projects by category" role="group">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>

      {visibleProjects.length > 0 ? (
        <section className="catalog-app-results" aria-labelledby="open-source-results-title">
          <div className="catalog-results-label">
            <h2 id="open-source-results-title">Open-source projects</h2>
            <span>{visibleProjects.length} results</span>
          </div>
          <div className="catalog-grid">
            {visibleProjects.map((project) => (
              <Link
                className="app-card"
                href={`/open-source/${project.slug}`}
                key={project.slug}
                style={{ "--app-accent": project.accent } as React.CSSProperties}
              >
                <div className="app-card-topline">
                  <span>{String(project.index).padStart(3, "0")}</span>
                  <span>{project.category}</span>
                </div>
                <div className="app-card-logo-wrap">
                  <Image
                    className="app-logo"
                    src={getProjectLogoUrl(project)}
                    alt={`${project.name} logo`}
                    width={48}
                    height={48}
                    unoptimized
                  />
                </div>
                <div className="app-card-copy">
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                </div>
                <div className="app-card-meta">
                  <span>{project.popularitySignal}</span>
                  <span>GitHub source</span>
                  <ArrowUpRight className="app-card-arrow" size={16} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="catalog-empty">
          <span>00</span>
          <h2>No repository found.</h2>
          <p>Try another project, category, or keyword.</p>
          <button type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      )}
    </div>
  );
}
