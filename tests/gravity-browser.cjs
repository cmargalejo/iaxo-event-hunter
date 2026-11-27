const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const C = require("../assets/gravity-core.js");
const root = path.resolve(__dirname, "..");
const gameURL = pathToFileURL(path.join(root, "gravedad-oculta.html")).href;
const out = "/tmp/gravity-puzzle-preview";
const seeds = [0.23, 0.61, 0.82, 0.11, 0.46];
fs.mkdirSync(out, { recursive: true });

async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Page must fit the viewport",
  );
}
async function mapPoint(page, p) {
  await page.locator("#map").scrollIntoViewIfNeeded();
  const box = await page.locator("#map").boundingBox();
  return {
    x: box.x + (p.x / C.WIDTH) * box.width,
    y: box.y + (p.y / C.HEIGHT) * box.height,
  };
}
async function mark(page, p, touch = false) {
  const where = await mapPoint(page, p);
  if (touch) await page.touchscreen.tap(where.x, where.y);
  else await page.mouse.click(where.x, where.y);
}
async function setup(browser, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    ...options,
  });
  const errors = [];
  await context.addInitScript((values) => {
    let i = 0;
    Math.random = () => values[i++ % values.length];
  }, seeds);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(gameURL);
  return { context, page, errors };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page, errors } = await setup(browser);
    await page.screenshot({
      path: path.join(out, "welcome-desktop.png"),
      fullPage: true,
    });
    await page.locator("#start").click();
    assert.equal(await page.locator("#mark-mode").isDisabled(), true);
    await page.locator("#map").focus();
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.locator("#power").inputValue(), "50");
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#shot-count").textContent(), "1");
    await page.locator("[data-port='1']").click();
    assert.equal(
      await page.locator("[data-port='1']").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#launch").click();
    await page.screenshot({
      path: path.join(out, "trails-desktop.png"),
      fullPage: true,
    });
    await page.locator("#mark-mode").click();
    await page.locator("#map").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#check").isEnabled(), true);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.locator("#clear-marks").click();
    assert.equal(await page.locator("#check").isDisabled(), true);

    for (let level = 0; level < 3; level += 1) {
      if (level > 0) await page.locator("#launch").click();
      await page.locator("#mark-mode").click();
      const round = C.makeRound(level, Math.floor(seeds[level] * 4294967296));
      const masses = [...round.masses].reverse();
      for (let index = 0; index < masses.length; index += 1) {
        if (level === 0) {
          const misplaced = { x: masses[index].x, y: masses[index].y + 180 };
          await mark(page, misplaced);
          const from = await mapPoint(page, misplaced);
          const to = await mapPoint(page, masses[index]);
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          await page.mouse.move(to.x, to.y, { steps: 8 });
          await page.mouse.up();
        } else await mark(page, masses[index]);
        if (level === 2 && index === 0)
          assert.equal(await page.locator("#check").isDisabled(), true);
      }
      await page.locator("#check").click();
      assert.equal(
        await page.locator("#stars").getAttribute("aria-label"),
        "3 de 3 estrellas",
      );
      assert.equal(await page.locator("#controls").isHidden(), true);
      assert.equal(await page.locator("#legend").isVisible(), true);
      if (level === 2)
        await page.screenshot({
          path: path.join(out, "reveal-desktop.png"),
          fullPage: true,
        });
      await page.locator("#next").click();
    }
    assert.equal(await page.locator("#total-score").textContent(), "9");
    await page.reload();
    assert.match(await page.locator("#welcome-best").textContent(), /9 de 9/);
    await page.locator("#start").click();
    await page.locator("#launch").click();
    await page.locator("#clear").click();
    assert.equal(
      await page.locator("#shot-count").textContent(),
      "1",
      "Clearing trails preserves shot count",
    );
    await page.locator("#mark-mode").click();
    await mark(page, { x: 30, y: 30 });
    await page.locator("#check").click();
    assert.equal(
      await page.locator("#stars").getAttribute("aria-label"),
      "0 de 3 estrellas",
    );
    await page.locator("#retry").click();
    assert.equal(await page.locator("#shot-count").textContent(), "0");
    assert.equal(await page.locator("#result").isHidden(), true);
    assert.equal(await page.locator("#mark-mode").isDisabled(), true);

    // Dragging launches; canceling a drag never launches.
    const from = await mapPoint(page, { x: 200, y: 300 });
    const to = await mapPoint(page, { x: 750, y: 600 });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(await page.locator("#shot-count").textContent(), "0");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    assert.equal(await page.locator("#shot-count").textContent(), "1");
    await noOverflow(page);
    assert.deepEqual(errors, []);
    await context.close();

    // Real animation and launch throttling, independent of reduced-motion tests.
    const animated = await setup(browser, { reducedMotion: "no-preference" });
    await animated.page.locator("#start").click();
    for (let i = 0; i < 3; i += 1)
      await animated.page.locator("#launch").click();
    assert.equal(await animated.page.locator("#launch").isDisabled(), true);
    await animated.page.locator("#mark-mode").click();
    await mark(animated.page, { x: 500, y: 450 });
    assert.equal(await animated.page.locator("#check").isDisabled(), true);
    await animated.page.waitForFunction(
      () => !document.getElementById("check").disabled,
    );
    await animated.page.locator("#check").click();
    assert.equal(await animated.page.locator("#result").isVisible(), true);
    assert.deepEqual(animated.errors, []);
    await animated.context.close();

    for (const width of [390, 320]) {
      const mobile = await setup(browser, {
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      const p = mobile.page;
      await noOverflow(p);
      await p.screenshot({
        path: path.join(out, `welcome-${width}.png`),
        fullPage: true,
      });
      await p.locator("#start").tap();
      const a = await mapPoint(p, { x: 140, y: 400 });
      const b = await mapPoint(p, { x: 760, y: 570 });
      const cdp = await mobile.context.newCDPSession(p);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: a.x, y: a.y }],
      });
      for (let i = 1; i <= 8; i += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: a.x + ((b.x - a.x) * i) / 8, y: a.y + ((b.y - a.y) * i) / 8 },
          ],
        });
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert.equal(await p.locator("#shot-count").textContent(), "1");
      await p.locator("[data-port='1']").tap();
      await p.locator("#launch").tap();
      assert.equal(await p.locator("#shot-count").textContent(), "2");
      await p.screenshot({
        path: path.join(out, `trails-${width}.png`),
        fullPage: true,
      });
      await p.locator("#mark-mode").tap();
      const actual = C.makeRound(0, Math.floor(seeds[0] * 4294967296))
        .masses[0];
      await mark(p, actual, true);
      assert.equal(await p.locator("#check").isEnabled(), true);
      await p.locator("#check").tap();
      assert.equal(
        await p.locator("#stars").getAttribute("aria-label"),
        "3 de 3 estrellas",
      );
      await p.screenshot({
        path: path.join(out, `reveal-${width}.png`),
        fullPage: true,
      });
      await noOverflow(p);
      await p.locator("#next").tap();
      await p.locator("#new-map").tap();
      assert.equal(await p.locator("#shot-count").textContent(), "0");
      await p.goto(pathToFileURL(path.join(root, "juegos.html")).href);
      assert.equal(await p.locator(".mission").count(), 4);
      await noOverflow(p);
      await p.locator('a[href="gravedad-oculta.html"]').tap();
      await p.waitForURL(gameURL);
      await p.locator("#start").waitFor({ state: "visible" });
      assert.equal(await p.locator("#start").isVisible(), true);
      assert.deepEqual(mobile.errors, []);
      await mobile.context.close();
    }
    console.log(
      `Gravity browser checks passed: three sectors, scoring, retries, storage, keyboard, mouse, touch, animation and layouts at 1280/390/320 px. Screenshots: ${out}`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
