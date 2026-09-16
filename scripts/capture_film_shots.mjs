import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";

const chrome =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const OUT = "/workspace/public/film-shots";
mkdirSync(OUT, { recursive: true });

function center(box) {
  return [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)];
}

const browser = await chromium.launch({
  executablePath: chrome,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.addInitScript(() => {
  try {
    localStorage.setItem("stacks-skin-v5", "light");
  } catch {}
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(900);
await page.evaluate(() => document.documentElement.setAttribute("data-film-capture", "1"));

const coords = {};

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 90 });
  console.log("shot", name);
}

async function mark(key, loc) {
  try {
    const box = await loc.first().boundingBox({ timeout: 2500 });
    if (box) coords[key] = center(box);
  } catch (e) {
    console.log("miss", key);
  }
}

const filter = (name) => page.getByRole("button", { name, exact: true });

await mark("explore", page.locator("section#top a[href='#apps']"));
await mark("exploreTools", page.locator("section#top a[href='#tools']"));
await shot("home");
await page.evaluate(() => document.documentElement.removeAttribute("data-film-capture"));

await page.locator("section#top a[href='#apps']").first().click();
await page.waitForTimeout(600);
await mark("app0", page.locator("section#apps button.app-card"));
await mark("app1", page.locator("section#apps button.app-card").nth(1));
await shot("apps");

await page.locator("section#apps button.app-card").nth(1).click();
await page.waitForTimeout(500);
await mark("download", page.getByRole("button", { name: /^download$/i }));
await mark("share", page.getByRole("button", { name: /share/i }));
await mark("open", page.getByRole("link", { name: /open app/i }));
await shot("app-detail");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.evaluate(() => {
  const overlay = document.querySelector("[aria-modal='true']")?.parentElement;
  if (overlay) overlay.click();
});
await page.waitForTimeout(400);

await page.locator("a[href='#tools']").nth(1).click().catch(() =>
  page.locator("section#top a[href='#tools']").click(),
);
await page.waitForTimeout(700);
await mark("search", page.locator("section#tools input[type='search']"));
await mark("filterWriting", filter("Writing"));
await mark("filterImage", filter("Image"));
await mark("filterVideo", filter("Video"));
await mark("filterSeo", filter("SEO"));
await mark("tool0", page.locator("section#tools button.tool-card"));
await shot("tools");

await filter("Writing").click();
await page.waitForTimeout(400);
await shot("tools-writing");

await filter("Image").click();
await page.waitForTimeout(400);
await shot("tools-image");

await filter("Video").click();
await page.waitForTimeout(400);
await shot("tools-video");

await filter("Writing").click();
await page.waitForTimeout(300);
await page.locator("section#tools button.tool-card").first().click();
await page.waitForTimeout(800);
await mark("run", page.getByRole("button", { name: /^run$/i }));
await mark("regen", page.getByRole("button", { name: /regen/i }));
await mark("dlTool", page.getByRole("button", { name: /^download$/i }));
await mark("copy", page.getByRole("button", { name: /^copy$/i }));
await mark("pdf", page.getByRole("button", { name: /^pdf$/i }));
await mark("txt", page.getByRole("button", { name: /^txt$/i }));
await mark("html", page.getByRole("button", { name: /^html$/i }));
await mark("doc", page.getByRole("button", { name: /^doc$/i }));
await shot("workspace");

writeFileSync(`${OUT}/coords.json`, JSON.stringify(coords, null, 2));
console.log("coords", JSON.stringify(coords));
await browser.close();
