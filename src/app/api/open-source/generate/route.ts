import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  assertReadmeSize,
  buildRepositoryPrompt,
  detectRootManifests,
  parseGitHubRepositoryUrl,
  RepositoryPromptError,
  type GitHubReadmeMetadata,
  type GitHubRepositoryMetadata,
} from "@/lib/github-repository-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1_024;
const GITHUB_TIMEOUT_MS = 8_000;
const GITHUB_CACHE_SECONDS = 15 * 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;
const MAX_RATE_LIMIT_KEYS = 5_000;

const requestSchema = z
  .object({
    repositoryUrl: z.string().trim().min(1).max(300),
  })
  .strict();

const repositorySchema = z.object({
  name: z.string().min(1).max(100),
  full_name: z.string().min(3).max(140),
  description: z.string().max(1_000).nullable(),
  default_branch: z.string().min(1).max(255),
  language: z.string().max(100).nullable(),
  stargazers_count: z.number().int().nonnegative(),
  archived: z.boolean(),
  disabled: z.boolean(),
  private: z.boolean(),
  license: z
    .object({
      spdx_id: z.string().max(100).nullable(),
      name: z.string().max(200),
    })
    .nullable(),
  updated_at: z.string().min(1).max(100),
});

const readmeSchema = z.object({
  path: z.string().min(1).max(1_024),
  html_url: z.string().url().max(2_048),
  sha: z.string().regex(/^[0-9a-f]{40,64}$/i),
  size: z.number().int().nonnegative(),
  encoding: z.string().max(30),
  content: z.string().max(360_000),
});

const rootContentsSchema = z
  .array(
    z.object({
      name: z.string().min(1).max(255),
      type: z.string().max(30),
    }),
  )
  .max(2_000);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitState {
  allowed: boolean;
  remaining: number;
  resetAfterSeconds: number;
}

class GitHubRateLimitError extends RepositoryPromptError {
  constructor(readonly retryAfterSeconds: number) {
    super(
      "GitHub's public API limit has been reached. Please try this repository again later.",
      "github_rate_limited",
      429,
    );
  }
}

const rateLimits = new Map<string, RateLimitEntry>();

function requestClientKey(request: NextRequest): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim().slice(0, 100) || "unknown";
}

function takeRateLimit(request: NextRequest): RateLimitState {
  const now = Date.now();
  const key = requestClientKey(request);
  const current = rateLimits.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
      : current;

  const allowed = entry.count < RATE_LIMIT_REQUESTS;
  if (allowed) entry.count += 1;
  rateLimits.set(key, entry);

  while (rateLimits.size > MAX_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimits.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimits.delete(oldestKey);
  }

  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT_REQUESTS - entry.count),
    resetAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
  };
}

function responseHeaders(rateLimit: RateLimitState, retryAfter?: number): HeadersInit {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.resetAfterSeconds),
  };
  if (retryAfter !== undefined) headers["Retry-After"] = String(retryAfter);
  return headers;
}

function errorResponse(
  error: RepositoryPromptError,
  rateLimit: RateLimitState,
  retryAfter?: number,
) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    {
      status: error.status,
      headers: responseHeaders(rateLimit, retryAfter),
    },
  );
}

function githubEndpoint(owner: string, repo: string, suffix = ""): string {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

function githubRetryAfter(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.ceil(retryAfter);

  const resetAt = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(resetAt) && resetAt > 0) {
    return Math.max(1, Math.ceil(resetAt - Date.now() / 1_000));
  }

  return 60;
}

async function fetchGitHubJson(
  url: string,
  endpoint: "repository" | "readme" | "contents",
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SetupWith/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: GITHUB_CACHE_SECONDS },
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new RepositoryPromptError(
        "GitHub took too long to respond. Please try again.",
        "github_timeout",
        504,
      );
    }

    throw new RepositoryPromptError(
      "GitHub could not be reached. Please try again.",
      "github_unavailable",
      502,
    );
  }

  if (response.status === 429 || response.status === 403) {
    throw new GitHubRateLimitError(githubRetryAfter(response));
  }

  if (response.status === 404) {
    if (endpoint === "repository") {
      throw new RepositoryPromptError(
        "That public repository was not found. Check the URL and repository visibility.",
        "repository_not_found",
        404,
      );
    }

    if (endpoint === "readme") {
      throw new RepositoryPromptError(
        "This repository does not have a readable root README on its default branch.",
        "readme_missing",
        422,
      );
    }
  }

  if (!response.ok) {
    throw new RepositoryPromptError(
      endpoint === "contents"
        ? "The repository root could not be inspected on GitHub."
        : "GitHub could not provide the repository documentation.",
      "github_request_failed",
      502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new RepositoryPromptError(
      "GitHub returned an unreadable response. Please try again.",
      "github_response_invalid",
      502,
    );
  }
}

function parseUpstream<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new RepositoryPromptError(
      "GitHub returned an unexpected response. Please try again.",
      "github_response_invalid",
      502,
    );
  }
  return parsed.data;
}

function safeSingleLine(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeDescription(value: string): string | null {
  const description = safeSingleLine(value, 500);
  if (!description) return null;

  const looksLikeInstruction =
    /(?:ignore|disregard|override|forget).{0,50}(?:instruction|prompt|policy)|(?:system|developer|assistant)\s*(?:message|prompt)\s*:/i;
  return looksLikeInstruction.test(description) ? null : description;
}

function safeGitHubHtmlUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RepositoryPromptError(
      "GitHub returned an unexpected README link.",
      "github_response_invalid",
      502,
    );
  }

  if (
    url.protocol !== "https:" ||
    (url.hostname !== "github.com" && url.hostname !== "www.github.com") ||
    url.username ||
    url.password
  ) {
    throw new RepositoryPromptError(
      "GitHub returned an unexpected README link.",
      "github_response_invalid",
      502,
    );
  }

  return url.toString();
}

function decodeReadme(content: string, encoding: string, reportedSize: number): string {
  assertReadmeSize(reportedSize);
  if (encoding.toLowerCase() !== "base64") {
    throw new RepositoryPromptError(
      "GitHub did not return this README in a supported format.",
      "readme_unavailable",
      422,
    );
  }

  const normalized = content.replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new RepositoryPromptError(
      "GitHub returned an unreadable README.",
      "readme_unavailable",
      422,
    );
  }

  const bytes = Buffer.from(normalized, "base64");
  assertReadmeSize(bytes.byteLength);
  return bytes.toString("utf8").replace(/^\uFEFF/, "");
}

function repositoryLicense(license: { spdx_id: string | null; name: string } | null) {
  if (!license) return null;
  return license.spdx_id && license.spdx_id !== "NOASSERTION"
    ? license.spdx_id
    : safeSingleLine(license.name, 200) || null;
}

export async function POST(request: NextRequest) {
  const rateLimit = takeRateLimit(request);
  if (!rateLimit.allowed) {
    return errorResponse(
      new RepositoryPromptError(
        "Too many prompt requests. Please wait a moment and try again.",
        "rate_limited",
        429,
      ),
      rateLimit,
      rateLimit.resetAfterSeconds,
    );
  }

  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      throw new RepositoryPromptError(
        "Send the repository URL as JSON.",
        "unsupported_media_type",
        415,
      );
    }

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      throw new RepositoryPromptError(
        "The request body is too large.",
        "request_too_large",
        413,
      );
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
      throw new RepositoryPromptError(
        "The request body is too large.",
        "request_too_large",
        413,
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new RepositoryPromptError(
        "The request body must be valid JSON.",
        "invalid_request",
        400,
      );
    }

    const parsedRequest = requestSchema.safeParse(body);
    if (!parsedRequest.success) {
      throw new RepositoryPromptError(
        "Provide one repositoryUrl containing a public GitHub repository URL.",
        "invalid_request",
        400,
      );
    }

    const parsedRepository = parseGitHubRepositoryUrl(parsedRequest.data.repositoryUrl);
    const repositoryValue = await fetchGitHubJson(
      githubEndpoint(parsedRepository.owner, parsedRepository.repo),
      "repository",
    );
    const repositoryData = parseUpstream(repositorySchema, repositoryValue);

    if (repositoryData.private) {
      throw new RepositoryPromptError(
        "Private repositories are not supported. Use a public GitHub repository.",
        "private_repository",
        422,
      );
    }
    if (repositoryData.disabled) {
      throw new RepositoryPromptError(
        "This repository is disabled and cannot be inspected.",
        "repository_disabled",
        422,
      );
    }
    if (repositoryData.full_name.toLowerCase() !== parsedRepository.fullName.toLowerCase()) {
      throw new RepositoryPromptError(
        "GitHub returned a different repository than the one requested.",
        "github_response_invalid",
        502,
      );
    }

    const defaultBranch = safeSingleLine(repositoryData.default_branch, 255);
    if (!defaultBranch) {
      throw new RepositoryPromptError(
        "GitHub did not provide a valid default branch.",
        "github_response_invalid",
        502,
      );
    }

    const ref = encodeURIComponent(defaultBranch);
    const [readmeValue, rootContentsValue] = await Promise.all([
      fetchGitHubJson(
        githubEndpoint(parsedRepository.owner, parsedRepository.repo, `/readme?ref=${ref}`),
        "readme",
      ),
      fetchGitHubJson(
        githubEndpoint(parsedRepository.owner, parsedRepository.repo, `/contents?ref=${ref}`),
        "contents",
      ),
    ]);
    const readmeData = parseUpstream(readmeSchema, readmeValue);
    const rootContents = parseUpstream(rootContentsSchema, rootContentsValue);
    const readmeMarkdown = decodeReadme(
      readmeData.content,
      readmeData.encoding,
      readmeData.size,
    );

    const repository: GitHubRepositoryMetadata = {
      name: safeSingleLine(repositoryData.name, 100),
      fullName: safeSingleLine(repositoryData.full_name, 140),
      url: parsedRepository.url,
      description: repositoryData.description ? safeDescription(repositoryData.description) : null,
      defaultBranch,
      language: repositoryData.language
        ? safeSingleLine(repositoryData.language, 100) || null
        : null,
      stars: repositoryData.stargazers_count,
      archived: repositoryData.archived,
      disabled: repositoryData.disabled,
      license: repositoryLicense(repositoryData.license),
      updatedAt: repositoryData.updated_at,
    };
    const readme: GitHubReadmeMetadata = {
      path: safeSingleLine(readmeData.path, 1_024),
      url: safeGitHubHtmlUrl(readmeData.html_url),
      sha: readmeData.sha.toLowerCase(),
      bytes: readmeData.size,
    };
    const manifests = detectRootManifests(
      rootContents.filter((item) => item.type === "file").map((item) => item.name),
    );
    const generatedAt = new Date().toISOString();
    const result = buildRepositoryPrompt({
      repository,
      readme,
      readmeMarkdown,
      manifests,
      generatedAt,
    });

    return NextResponse.json(result, { headers: responseHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      return errorResponse(error, rateLimit, error.retryAfterSeconds);
    }
    if (error instanceof RepositoryPromptError) {
      return errorResponse(error, rateLimit);
    }

    console.error("Failed to generate GitHub repository prompt", error);
    return errorResponse(
      new RepositoryPromptError(
        "The repository prompt could not be generated. Please try again.",
        "internal_error",
        500,
      ),
      rateLimit,
    );
  }
}
