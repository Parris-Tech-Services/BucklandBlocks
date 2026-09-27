import { chromium } from "playwright";
import fs from "node:fs";

const baseURL = process.env.PLAYTEST_URL || "http://127.0.0.1:4173";
const results = {
  url: baseURL,
  webgl: false,
  canvas: false,
  fpsObserved: null,
  pause: false,
  crafting: false,
  inventory: false,
  saveReload: false,
  pointerLock: false,
  movement: "BLOCKED",
  consoleErrors: [],
  pageErrors: [],
};

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
  ],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForSelector("canvas", { timeout: 30_000 });
  results.canvas = true;

  const body = await page.locator("body").innerText();
  if (body.includes("couldn’t start 3D graphics")) {
    throw new Error("Game rendered the WebGL failure screen.");
  }

  results.webgl = await page.locator("canvas").evaluate((canvas) => {
    const element = canvas;
    return Boolean(element.getContext("webgl2") || element.getContext("webgl"));
  });
  if (!results.webgl) throw new Error("Canvas exists but WebGL context is unavailable.");

  await page.waitForTimeout(2500);
  const hudText = await page.locator("body").innerText();
  const fpsMatch = hudText.match(/FPS:\s*(\d+)/);
  results.fpsObserved = fpsMatch ? Number(fpsMatch[1]) : null;

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Resume Game" }).waitFor({ timeout: 5000 });
  results.pause = true;
  await page.getByRole("button", { name: "Resume Game" }).click();

  await page.keyboard.press("KeyC");
  await page.getByText("Crafting", { exact: true }).waitFor({ timeout: 5000 });
  const craftButtons = page.getByRole("button", { name: "Craft" });
  if ((await craftButtons.count()) < 2) throw new Error("Expected craft recipe buttons.");
  await craftButtons.nth(1).click();
  await page.getByText(/Crafted 4 × Torches?\./).waitFor({ timeout: 5000 });
  results.crafting = true;
  await page.getByRole("button", { name: "Close crafting" }).click();

  await page.keyboard.press("KeyE");
  await page.getByText("Inventory", { exact: true }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Inventory slot 1" }).click();
  await page.getByRole("button", { name: "Inventory slot 10" }).click();
  const slot10Text = await page.getByRole("button", { name: "Inventory slot 10" }).innerText();
  if (!slot10Text.includes("Wood")) throw new Error("Inventory swap did not move wood into slot 10.");
  results.inventory = true;
  await page.getByRole("button", { name: "Close inventory" }).click();

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    results.pointerLock = await page.evaluate(() => Boolean(document.pointerLockElement));
    if (results.pointerLock) {
      const before = await page.locator("body").innerText();
      const beforeXYZ = before.match(/XYZ:\s*([^\n]+)/)?.[1] ?? null;
      await page.keyboard.down("KeyW");
      await page.waitForTimeout(900);
      await page.keyboard.up("KeyW");
      await page.waitForTimeout(400);
      const after = await page.locator("body").innerText();
      const afterXYZ = after.match(/XYZ:\s*([^\n]+)/)?.[1] ?? null;
      results.movement = beforeXYZ && afterXYZ && beforeXYZ !== afterXYZ ? "PASS" : "FAIL";
    }
  }

  if (results.pointerLock) await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save World" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Save World" }).click();
  const saved = await page.evaluate(() => localStorage.getItem("buckland_blocks_save"));
  if (!saved) throw new Error("Save button did not write a save.");
  const parsed = JSON.parse(saved);
  if (parsed.version !== 2) throw new Error("Save schema version is not 2.");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30_000 });
  const restored = await page.evaluate(() => localStorage.getItem("buckland_blocks_save"));
  results.saveReload = Boolean(restored);
  if (!results.saveReload) throw new Error("Save disappeared after reload.");

  if (results.pageErrors.length) throw new Error("Page errors: " + results.pageErrors.join(" | "));
  const seriousConsoleErrors = results.consoleErrors.filter((message) =>
    !message.includes("THREE.WebGLRenderer") && !message.includes("GPU stall")
  );
  if (seriousConsoleErrors.length) throw new Error("Console errors: " + seriousConsoleErrors.join(" | "));

  if (results.movement === "FAIL") throw new Error("Pointer lock worked but movement did not change player coordinates.");
} finally {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync("artifacts/playtest-result.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}
