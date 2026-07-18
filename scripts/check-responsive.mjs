#!/usr/bin/env node

import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

const baseUrl = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3000";
const captureDirectory = process.env.RESPONSIVE_CAPTURE_DIR
  ? path.resolve(process.env.RESPONSIVE_CAPTURE_DIR)
  : null;
const widths = process.env.RESPONSIVE_WIDTHS
  ? process.env.RESPONSIVE_WIDTHS.split(",").map(Number)
  : [320, 375, 390];
const routes = process.env.RESPONSIVE_ROUTES?.split(",") ?? [
  "/",
  "/apps",
  "/apps?experience=gaming",
  "/apps?experience=entertainment",
  "/how-it-works",
  "/security",
  "/profile",
  "/visual-studio-code",
  "/steam",
  "/spotify",
  "/route-that-does-not-exist",
];

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Keep looking for an executable browser.
    }
  }

  throw new Error("Chrome or Chromium was not found. Set CHROME_PATH to its executable.");
}

async function assertServerIsReady() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `SetupWith is not reachable at ${baseUrl}. Start it first with \`npm run dev\`. (${error.message})`,
    );
  }
}

function waitForDebugEndpoint(stream) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error("Chrome did not expose a debug endpoint.")), 30_000);

    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    stream.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function getPageWebSocketUrl(debugEndpoint) {
  const endpoint = new URL(debugEndpoint);
  const targetListUrl = `http://${endpoint.host}/json/list`;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(targetListUrl);
    const targets = await response.json();
    const page = targets.find((target) => target.type === "page");
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    await delay(100);
  }

  throw new Error("Chrome started without a page target.");
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  let commandId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));

    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
      return;
    }

    const waiters = eventWaiters.get(message.method);
    const waiter = waiters?.shift();
    if (waiter) waiter.resolve(message.params);
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  function waitForEvent(method, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
      const waiters = eventWaiters.get(method) ?? [];
      const timeout = setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);
      const waiter = {
        resolve(value) {
          clearTimeout(timeout);
          resolve(value);
        },
      };
      waiters.push(waiter);
      eventWaiters.set(method, waiters);
    });
  }

  function close() {
    return new Promise((resolve) => {
      if (socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      socket.addEventListener("close", resolve, { once: true });
      socket.close();
      setTimeout(resolve, 1_000);
    });
  }

  return { close, send, waitForEvent };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Page evaluation failed.");
  }

  return result.result.value;
}

const layoutAuditExpression = `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const rootOverflow = document.documentElement.scrollWidth - viewportWidth;
  const rendered = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const insideHorizontalScroller = (element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth + 1) {
        return true;
      }
    }
    return false;
  };
  const selectorFor = (element) => {
    if (element.id) return "#" + element.id;
    const classes = Array.from(element.classList).slice(0, 2).join(".");
    return element.tagName.toLowerCase() + (classes ? "." + classes : "");
  };
  const clipped = Array.from(document.querySelectorAll("main *, footer *"))
    .filter(rendered)
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return (rect.left < -1 || rect.right > viewportWidth + 1) && !insideHorizontalScroller(element);
    })
    .slice(0, 8)
    .map((element) => ({
      selector: selectorFor(element),
      parent: element.parentElement ? selectorFor(element.parentElement) : null,
      text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 70),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
    }));

  return {
    title: document.title,
    viewportWidth,
    rootOverflow,
    clipped,
    errorOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
  };
})()`;

const mobileNavAuditExpression = `(async () => {
  const toggle = document.querySelector(".mobile-nav-toggle");
  const visible = toggle && getComputedStyle(toggle).display !== "none" && toggle.getBoundingClientRect().width > 0;
  if (!visible) return { visible: false };
  for (let attempt = 0; attempt < 20 && toggle.getAttribute("aria-expanded") !== "true"; attempt += 1) {
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  const hrefs = panel ? Array.from(panel.querySelectorAll("a")).map((link) => link.getAttribute("href")) : [];
  return {
    visible: true,
    expanded: toggle.getAttribute("aria-expanded"),
    controlledPanelExists: Boolean(panel),
    toggleWidth: Math.round(toggle.getBoundingClientRect().width),
    toggleHeight: Math.round(toggle.getBoundingClientRect().height),
    hrefs,
  };
})()`;

const mobileNavEscapeAuditExpression = `(async () => {
  const toggle = document.querySelector(".mobile-nav-toggle");
  for (let attempt = 0; attempt < 20 && toggle?.getAttribute("aria-expanded") !== "false"; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const panel = toggle ? document.getElementById(toggle.getAttribute("aria-controls")) : null;
  return {
    collapsed: toggle?.getAttribute("aria-expanded") === "false",
    focusReturned: document.activeElement === toggle,
    panelHidden: Boolean(panel?.hidden),
  };
})()`;

const interactiveStateAuditExpression = `(async () => {
  const bundleDetails = Array.from(document.querySelectorAll("details.bundle-prompt-preview"));
  const bundleCopy = document.querySelector(".bundle-copy-button");
  const initialBundleCopyText = bundleCopy?.textContent?.trim();
  for (let attempt = 0; bundleCopy && attempt < 20 && bundleCopy.textContent?.trim() === initialBundleCopyText; attempt += 1) {
    bundleCopy.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  bundleDetails.forEach((details) => { details.open = true; });

  const promptToggle = document.querySelector(".prompt-preview-bar button");
  for (let attempt = 0; promptToggle && attempt < 20 && promptToggle.getAttribute("aria-expanded") !== "true"; attempt += 1) {
    promptToggle.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    bundleDetailsOpened: bundleDetails.filter((details) => details.open).length,
    bundleCopyStateChanged: Boolean(bundleCopy && bundleCopy.textContent?.trim() !== initialBundleCopyText),
    promptExpanded: promptToggle?.getAttribute("aria-expanded") === "true",
  };
})()`;

const experienceAuditExpression = `(() => {
  const shell = document.querySelector(".catalog-experience-shell");
  const switcher = document.querySelector(".experience-switcher > div");
  const buttons = Array.from(document.querySelectorAll(".experience-switcher button"));
  const active = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
  const last = buttons.at(-1);
  if (last) last.scrollIntoView({ block: "nearest", inline: "end" });
  return {
    experience: shell?.getAttribute("data-experience"),
    activeText: active?.textContent?.trim(),
    buttonCount: buttons.length,
    switcherScrollable: Boolean(switcher && switcher.scrollWidth >= switcher.clientWidth),
    lastVisible: Boolean(last && last.getBoundingClientRect().right <= document.documentElement.clientWidth + 1),
  };
})()`;

async function main() {
  await assertServerIsReady();
  const chromePath = await findChrome();
  const profileDirectory = await mkdtemp(path.join(tmpdir(), "setupwith-responsive-"));
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDirectory}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let client;
  const failures = [];

  try {
    const debugEndpoint = await waitForDebugEndpoint(chrome.stderr);
    client = await createCdpClient(await getPageWebSocketUrl(debugEndpoint));
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    for (const width of widths) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 2,
        mobile: true,
      });

      for (const route of routes) {
        const loaded = client.waitForEvent("Page.loadEventFired");
        const [navigation] = await Promise.all([
          client.send("Page.navigate", { url: new URL(route, baseUrl).href }),
          loaded,
        ]);
        if (navigation.errorText) throw new Error(navigation.errorText);

        const audit = await evaluate(client, layoutAuditExpression);
        const label = `${width}px ${route}`;
        const routeFailures = [];

        if (captureDirectory) {
          await mkdir(captureDirectory, { recursive: true });
          const screenshot = await client.send("Page.captureScreenshot", {
            captureBeyondViewport: false,
            format: "png",
            fromSurface: true,
          });
          const routeName = route === "/apps"
            ? "catalog"
            : route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/gi, "-") || "home";
          await writeFile(
            path.join(captureDirectory, `${routeName}-${width}.png`),
            Buffer.from(screenshot.data, "base64"),
          );
        }

        if (audit.viewportWidth !== width) routeFailures.push(`viewport reported ${audit.viewportWidth}px`);
        if (audit.rootOverflow > 1) routeFailures.push(`${audit.rootOverflow}px document overflow`);
        if (audit.clipped.length > 0) routeFailures.push(`clipped: ${JSON.stringify(audit.clipped)}`);
        if (audit.errorOverlay) routeFailures.push("framework error overlay");

        if (route === "/apps" || route === "/visual-studio-code") {
          const stateAudit = await evaluate(client, interactiveStateAuditExpression);
          const stateLayout = await evaluate(client, layoutAuditExpression);
          if (stateLayout.rootOverflow > 1) {
            routeFailures.push(`${stateLayout.rootOverflow}px overflow in expanded state`);
          }
          if (stateLayout.clipped.length > 0) {
            routeFailures.push(`expanded-state clipping: ${JSON.stringify(stateLayout.clipped)}`);
          }
          if (route === "/apps" && (!stateAudit.bundleDetailsOpened || !stateAudit.bundleCopyStateChanged)) {
            routeFailures.push(`bundle controls did not respond: ${JSON.stringify(stateAudit)}`);
          }
          if (route === "/visual-studio-code" && !stateAudit.promptExpanded) {
            routeFailures.push(`detail prompt did not expand: ${JSON.stringify(stateAudit)}`);
          }
        }

        if (route.startsWith("/apps?experience=")) {
          const expectedExperience = new URL(route, baseUrl).searchParams.get("experience");
          const experienceAudit = await evaluate(client, experienceAuditExpression);
          if (
            experienceAudit.experience !== expectedExperience ||
            experienceAudit.buttonCount < 8 ||
            !experienceAudit.lastVisible
          ) {
            routeFailures.push(`experience controls failed: ${JSON.stringify(experienceAudit)}`);
          }
        }

        if (routeFailures.length > 0) {
          failures.push(`${label}: ${routeFailures.join("; ")}`);
          console.error(`FAIL ${label}`);
        } else {
          console.log(`PASS ${label}`);
        }
      }

      const navLoaded = client.waitForEvent("Page.loadEventFired");
      await Promise.all([
        client.send("Page.navigate", { url: new URL("/", baseUrl).href }),
        navLoaded,
      ]);
      const navAudit = await evaluate(client, mobileNavAuditExpression);
      if (captureDirectory && navAudit.expanded === "true") {
        await mkdir(captureDirectory, { recursive: true });
        const screenshot = await client.send("Page.captureScreenshot", {
          captureBeyondViewport: false,
          format: "png",
          fromSurface: true,
        });
        await writeFile(
          path.join(captureDirectory, `mobile-navigation-${width}.png`),
          Buffer.from(screenshot.data, "base64"),
        );
      }
      let escapeAudit = { collapsed: false, focusReturned: false, panelHidden: false };
      if (navAudit.expanded === "true") {
        await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
        await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
        escapeAudit = await evaluate(client, mobileNavEscapeAuditExpression);
      }
      const requiredDestinations = ["/apps", "/how-it-works", "/security", "/profile"];
      const missing = requiredDestinations.filter((href) => !navAudit.hrefs?.includes(href));
      if (
        !navAudit.visible ||
        navAudit.expanded !== "true" ||
        !navAudit.controlledPanelExists ||
        navAudit.toggleWidth < 44 ||
        navAudit.toggleHeight < 44 ||
        missing.length > 0 ||
        !escapeAudit.collapsed ||
        !escapeAudit.focusReturned ||
        !escapeAudit.panelHidden
      ) {
        failures.push(
          `${width}px mobile navigation: ${JSON.stringify({ ...navAudit, missing, escapeAudit })}`,
        );
        console.error(`FAIL ${width}px mobile navigation`);
      } else {
        console.log(`PASS ${width}px mobile navigation`);
      }
    }
  } finally {
    await client?.close();
    chrome.kill("SIGTERM");
    if (chrome.exitCode === null) {
      await Promise.race([once(chrome, "exit"), delay(3_000)]);
    }
    chrome.stderr.destroy();
    await rm(profileDirectory, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error("\nResponsive verification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  } else {
    console.log(`\nResponsive verification passed for ${routes.length} routes at ${widths.join("/ ")}px.`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
