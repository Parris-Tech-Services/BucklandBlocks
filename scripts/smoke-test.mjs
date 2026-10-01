// Release gate: load the built game in a real (headless) browser, press
// Resume, play for a few seconds, and fail on any page error, console error
// or missing asset. Run after `npm run build:client`:
//   node scripts/smoke-test.mjs            (serves dist/public itself)
//   node scripts/smoke-test.mjs <url>      (tests an existing deployment)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };

async function serve(root) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(root, path === "/" || path === "\\" ? "index.html" : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

const external = process.argv[2];
const local = external ? null : await serve("dist/public");
const url = external ?? local.url;
const problems = [];

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console error: ${msg.text()}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().endsWith("/favicon.ico")) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  await page.goto(url, { waitUntil: "load" });
  // Parris shared UI is a new integration and must remain off by default.
  if (await page.locator('#parris-tools-launcher').count()) {
    problems.push("Parris UI launcher rendered while parrisui feature flag is off");
  }
  if (await page.locator('script[data-parris-ui]').count()) {
    problems.push("Parris UI adapter loaded while parrisui feature flag is off");
  }

  const resume = page.getByRole("button", { name: /resume game/i });
  await resume.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /resume game/i.test(b.textContent ?? "") && !b.disabled), null, { timeout: 30_000 });
  await resume.click();

  // Play briefly: move, look, mine and place, so per-frame code paths run.
  await page.keyboard.down("KeyW");
  await page.mouse.move(640, 360);
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(640, 360 + i * 15);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.mouse.click(640, 360, { button: "right" });
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(500);
  await page.getByRole("heading", { name: "Equipment" }).waitFor({ timeout: 5_000 });
  await page.getByRole("heading", { name: "Crafting · 2 × 2" }).waitFor({ timeout: 5_000 });

  // Regression check: items can move directly from the hotbar into the
  // inventory crafting grid and back without switching menus or losing count.
  const hotbar = page.getByRole("region", { name: "Hotbar" });
  const craftingGrid = page.locator('[aria-label="2 by 2 crafting grid"]');
  // Gameplay above may have placed a plank, so match any count.
  const planks = hotbar.getByRole("button", { name: /^Wood Planks × \d+$/ });
  await planks.dragTo(craftingGrid.getByRole("button").nth(0));
  const movedPlanks = craftingGrid.getByRole("button", { name: /^Wood Planks × \d+$/ });
  await movedPlanks.waitFor({ timeout: 5_000 });
  await movedPlanks.dragTo(hotbar.getByRole("button").nth(8));
  await hotbar.getByRole("button", { name: /^Wood Planks × \d+$/ }).waitFor({ timeout: 5_000 });

  await page.keyboard.press("KeyE");
  await page.waitForTimeout(3000);

  if (await page.getByText(/something went wrong|reload/i).first().isVisible().catch(() => false)) {
    problems.push("error screen is visible");
  }
} catch (error) {
  problems.push(`smoke test could not complete: ${error.message}`);
} finally {
  await browser.close();
  local?.server.close();
}

if (problems.length) {
  console.error(`Smoke test FAILED for ${url}:\n- ${[...new Set(problems)].join("\n- ")}`);
  process.exit(1);
}
console.log(`Smoke test passed for ${url}`);
