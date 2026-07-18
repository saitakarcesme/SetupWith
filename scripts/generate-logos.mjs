import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as simpleIcons from "simple-icons";

const root = resolve(import.meta.dirname, "..");
const catalogPath = resolve(root, "src/data/chatgpt-catalog.json");
const additionsPath = resolve(root, "src/data/catalog-additions.json");
const consumerCatalogPath = resolve(root, "src/data/consumer-catalog.json");
const overridesPath = resolve(root, "src/data/logo-overrides.json");
const consumerOverridesPath = resolve(root, "src/data/consumer-logo-overrides.json");
const outputDir = resolve(root, "public/app-logos");

const catalog = [
  ...JSON.parse(await readFile(catalogPath, "utf8")),
  ...JSON.parse(await readFile(additionsPath, "utf8")),
  ...JSON.parse(await readFile(consumerCatalogPath, "utf8")),
];
const overrides = {
  ...JSON.parse(await readFile(overridesPath, "utf8")),
  ...JSON.parse(await readFile(consumerOverridesPath, "utf8")),
};
const iconsBySlug = new Map(
  Object.values(simpleIcons)
    .filter((icon) => icon && typeof icon === "object" && "slug" in icon)
    .map((icon) => [icon.slug, icon]),
);

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const toEmbeddedSvg = (name, mimeType, bytes) => {
  const encoded = Buffer.from(bytes).toString("base64");
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">',
    `<title>${escapeXml(name)}</title>`,
    `<image width="512" height="512" preserveAspectRatio="xMidYMid meet" href="data:${mimeType};base64,${encoded}" />`,
    "</svg>",
  ].join("");
};

const unsafeSvgPatterns = [
  [/<\!doctype/i, "DOCTYPE declarations"],
  [/<(?:script|foreignObject|iframe|object|embed)\b/i, "executable or embedded elements"],
  [/\son[a-z]+\s*=/i, "inline event handlers"],
  [/javascript\s*:/i, "javascript URLs"],
  [/@import\b/i, "external stylesheet imports"],
  [/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i, "remote hrefs"],
  [/url\(\s*["']?\s*(?:https?:)?\/\//i, "remote CSS URLs"],
];

const assertSafeSvg = (svg, name) => {
  if (!/<svg[\s>]/i.test(svg)) {
    throw new Error(`${name}: generated logo is not an SVG document`);
  }

  for (const [pattern, description] of unsafeSvgPatterns) {
    if (pattern.test(svg)) {
      throw new Error(`${name}: SVG contains ${description}`);
    }
  }

  return svg;
};

const normalizeSvg = (svg) =>
  svg
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();

const sanitizeSvg = (svg, name) => {
  if (/<!doctype[^>]*\[/i.test(svg)) {
    throw new Error(`${name}: SVG contains a DOCTYPE with an internal subset`);
  }

  return assertSafeSvg(svg.replace(/<!doctype[^>]*>/gi, ""), name);
};

const fetchAsset = async (url, name) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "SetupWith logo sync (github.com/saitakarcesme/SetupWith)" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${name}: ${url} returned HTTP ${response.status}`);
  }

  const mimeType = (response.headers.get("content-type") || "application/octet-stream")
    .split(";")[0]
    .trim();
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (mimeType.includes("svg") || Buffer.from(bytes).subarray(0, 200).toString("utf8").includes("<svg")) {
    return sanitizeSvg(Buffer.from(bytes).toString("utf8"), name);
  }

  if (!mimeType.startsWith("image/")) {
    throw new Error(`${name}: ${url} returned ${mimeType}, not an image`);
  }

  return assertSafeSvg(toEmbeddedSvg(name, mimeType, bytes), name);
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const manifest = {};
for (const app of catalog) {
  const icon = app.simpleIconSlug ? iconsBySlug.get(app.simpleIconSlug) : undefined;
  let svg;
  let source;
  let sourceType;

  if (overrides[app.slug]) {
    source = overrides[app.slug];
    sourceType = "official-project-asset";
    svg = await fetchAsset(source, app.name);
  } else if (icon) {
    source = icon.source;
    sourceType = "simple-icons-official-glyph";
    svg = icon.svg.replace("<svg ", `<svg fill="#${icon.hex}" `);
  } else {
    throw new Error(
      `${app.name}: no official logo is configured. Add a project-owned asset to ${overridesPath} or ${consumerOverridesPath}.`,
    );
  }

  const fileName = `${app.slug}.svg`;
  await writeFile(
    resolve(outputDir, fileName),
    `${normalizeSvg(assertSafeSvg(svg, app.name))}\n`,
    "utf8",
  );
  manifest[app.slug] = { file: fileName, source, sourceType };
}

await writeFile(resolve(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${catalog.length} local, source-attributed app logos.`);
