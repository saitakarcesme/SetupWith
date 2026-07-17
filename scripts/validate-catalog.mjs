import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/chatgpt-catalog.json"), "utf8"));
const prompts = JSON.parse(await readFile(resolve(projectRoot, "src/data/app-prompts.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(catalog), "Catalog must be an array");
assert(catalog.length === 100, `Catalog must contain exactly 100 entries; received ${catalog.length}`);

const slugs = new Set();
const names = new Set();

for (const [position, app] of catalog.entries()) {
  assert(app.index === position + 1, `Invalid index for ${app.slug ?? position}`);
  assert(typeof app.name === "string" && app.name.length > 1, `Missing name at index ${app.index}`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.slug), `Invalid slug: ${app.slug}`);
  assert(!slugs.has(app.slug), `Duplicate slug: ${app.slug}`);
  assert(!names.has(app.name.toLowerCase()), `Duplicate name: ${app.name}`);
  assert(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(app.repo), `Invalid repo: ${app.repo}`);
  assert(/^https:\/\//.test(app.website), `Invalid website: ${app.website}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(app.accent), `Invalid accent for ${app.slug}`);
  assert(Array.isArray(app.secrets) && Array.isArray(app.config), `Invalid context schema for ${app.slug}`);
  slugs.add(app.slug);
  names.add(app.name.toLowerCase());
}

assert(Object.keys(prompts).length === 100, `Prompt map must contain 100 prompts; received ${Object.keys(prompts).length}`);

for (const app of catalog) {
  const prompt = prompts[app.slug];
  assert(typeof prompt === "string", `Missing prompt for ${app.slug}`);
  const words = prompt.trim().split(/\s+/).length;
  assert(words >= 120 && words <= 280, `Prompt length for ${app.slug} is ${words} words`);
  assert(/verify|verification|confirm/i.test(prompt), `Prompt lacks verification for ${app.slug}`);
  assert(/rollback|uninstall|restore/i.test(prompt), `Prompt lacks rollback for ${app.slug}`);
  assert(!/(?:sk|ghp|github_pat)-?[A-Za-z0-9_]{20,}/.test(prompt), `Possible secret value in ${app.slug}`);
}

console.log(`Validated ${catalog.length} apps, ${slugs.size} unique slugs, and ${Object.keys(prompts).length} tailored prompts.`);
