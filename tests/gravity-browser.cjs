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
async function startGame(page, touch = false) {
  await page.locator("#start")[touch ? "tap" : "click"]();
  await page.locator("#reference-close")[touch ? "tap" : "click"]();
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
    assert.equal(
      await page
        .locator("#mass-reference")
        .evaluate((dialog) => dialog.matches(":modal")),
      true,
    );
    assert.equal(await page.locator("#reference-number").textContent(), "1");
    for (const type of C.MASS_TYPES) {
      await page.locator(`[data-reference="${type.id}"]`).click();
      assert.equal(
        await page.locator("#reference-number").textContent(),
        String(type.units),
      );
      const trajectory = C.simulate(C.PORTS[0], 0, 45, [
        { x: 500, y: 280, mu: type.mu },
      ]);
      const expected = trajectory.points
        .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" ");
      assert.equal(
        await page
          .locator(`[data-reference-path="${type.id}"]`)
          .getAttribute("d"),
        expected,
        "Reference examples use the game physics and identical launch conditions",
      );
      assert.equal(
        await page
          .locator(`[data-reference-path="${type.id}"]`)
          .getAttribute("opacity"),
        "1",
      );
      assert.equal(
        await page.locator("#shot-count").textContent(),
        "0",
        "Reference comparisons are free",
      );
    }
    await page.screenshot({
      path: path.join(out, "mass-reference-desktop.png"),
      fullPage: false,
    });
    await page.locator("#reference-close").click();
    assert.equal(await page.locator("#mark-mode").isDisabled(), true);
    for (const port of [2, 1, 0]) {
      await mark(page, C.PORTS[port]);
      assert.equal(
        await page
          .locator(`[data-port='${port}']`)
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page.locator("#shot-count").textContent(),
        "0",
        "Tapping a map arrow only selects a port",
      );
      assert.equal(await page.locator("#angle").inputValue(), "0");
      assert.equal(
        await page.locator("#power").inputValue(),
        "45",
        "Tapping an arrow preserves launch power",
      );
    }
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
    assert.equal(await page.locator("#check").isDisabled(), true);
    await page.locator('[data-guess="0"][data-mass="medium"]').click();
    assert.equal(await page.locator("#check").isEnabled(), true);
    const shotsBeforeReference = await page
      .locator("#shot-count")
      .textContent();
    await page.locator("#open-reference").click();
    await page.locator('[data-reference="large"]').click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#mass-reference").isHidden(), true);
    assert.equal(
      await page
        .locator("#open-reference")
        .evaluate((button) => button === document.activeElement),
      true,
      "Closing the reference restores keyboard focus",
    );
    assert.equal(
      await page
        .locator('[data-guess="0"][data-mass="medium"]')
        .getAttribute("aria-pressed"),
      "true",
      "Reference choices never change the player's estimates",
    );
    assert.equal(
      await page.locator("#shot-count").textContent(),
      shotsBeforeReference,
    );
    await page.locator("#map").focus();
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
        assert.equal(
          await page.locator("#check").isDisabled(),
          true,
          "Each marker needs an explicit mass estimate",
        );
        await page
          .locator(
            `[data-guess="${index}"][data-mass="${masses[index].massClass}"]`,
          )
          .click();
        if (level === 2 && index === 0)
          assert.equal(await page.locator("#check").isDisabled(), true);
      }
      const before = await page.locator("#shot-count").textContent();
      await page.locator("#predict").click();
      assert.equal(
        await page.locator("#predict").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.locator("#prediction-note").isVisible(), true);
      assert.equal(
        await page.locator("#result").isHidden(),
        true,
        "Trying an idea does not reveal the answer",
      );
      assert.equal(
        await page.locator("#shot-count").textContent(),
        before,
        "Predictions do not cost probes",
      );
      if (level === 0) {
        const correctImage = await page
          .locator("#map")
          .evaluate((map) => map.toDataURL());
        const wrong = C.MASS_TYPES.find(
          (type) => type.id !== masses[0].massClass,
        ).id;
        await page.locator(`[data-guess="0"][data-mass="${wrong}"]`).click();
        const changedImage = await page
          .locator("#map")
          .evaluate((map) => map.toDataURL());
        assert.notEqual(
          changedImage,
          correctImage,
          "Changing the mass redraws the predicted trails",
        );
        await page
          .locator(`[data-guess="0"][data-mass="${masses[0].massClass}"]`)
          .click();
        const from = await mapPoint(page, masses[0]);
        const to = await mapPoint(page, {
          x: masses[0].x + 30,
          y: masses[0].y + 20,
        });
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 4 });
        await page.mouse.up();
        assert.equal(
          await page
            .locator(`[data-guess="0"][data-mass="${masses[0].massClass}"]`)
            .getAttribute("aria-pressed"),
          "true",
          "Moving a marker keeps its mass estimate",
        );
        assert.equal(
          await page.locator("#predict").getAttribute("aria-pressed"),
          "true",
        );
      }
      if (level === 2)
        await page.screenshot({
          path: path.join(out, "mass-prediction-desktop.png"),
          fullPage: true,
        });
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
    await startGame(page);
    await page.locator("#launch").click();
    await page.locator("#clear").click();
    assert.equal(
      await page.locator("#shot-count").textContent(),
      "1",
      "Clearing trails preserves shot count",
    );
    await page.locator("#mark-mode").click();
    const original = C.makeRound(0, Math.floor(seeds[0] * 4294967296))
      .masses[0];
    await mark(page, original);
    const wrongType = C.MASS_TYPES.find(
      (type) => type.id !== original.massClass,
    ).id;
    await page.locator(`[data-guess="0"][data-mass="${wrongType}"]`).click();
    assert.equal(
      await page.locator("#predict").isDisabled(),
      true,
      "Cleared trails cannot be compared",
    );
    await page.locator("#check").click();
    assert.equal(
      await page.locator("#stars").getAttribute("aria-label"),
      "2 de 3 estrellas",
    );
    assert.match(
      await page.locator("#result-title").textContent(),
      /posición era buena/,
    );
    assert.match(
      await page.locator("#mass-results").textContent(),
      /elegiste|estimación/,
    );
    await page.locator("#retry").click();
    await page.locator("#launch").click();
    await page.locator("#mark-mode").click();
    await mark(page, { x: 30, y: 30 });
    await page.locator('[data-guess="0"][data-mass="small"]').click();
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
    const from = await mapPoint(page, C.PORTS[2]);
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
    assert.equal(
      await page.locator('[data-port="2"]').getAttribute("aria-pressed"),
      "true",
      "Dragging a map arrow launches from that port",
    );
    await noOverflow(page);
    assert.deepEqual(errors, []);
    await context.close();

    // Real animation and launch throttling, independent of reduced-motion tests.
    const animated = await setup(browser, { reducedMotion: "no-preference" });
    await startGame(animated.page);
    for (let i = 0; i < 3; i += 1)
      await animated.page.locator("#launch").click();
    assert.equal(await animated.page.locator("#launch").isDisabled(), true);
    await animated.page.locator("#mark-mode").click();
    await mark(animated.page, { x: 500, y: 450 });
    await animated.page.locator('[data-guess="0"][data-mass="medium"]').click();
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
      await p.locator('[data-reference="large"]').tap();
      const dialogBox = await p.locator("#mass-reference").boundingBox();
      assert.ok(dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width + 1);
      assert.equal(
        await p
          .locator("#mass-reference")
          .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1),
        true,
      );
      await p.locator("#mass-reference").evaluate((dialog) => {
        dialog.scrollTop = 0;
      });
      await p.screenshot({
        path: path.join(out, `mass-reference-${width}.png`),
        fullPage: false,
      });
      await p.locator("#reference-close").tap();
      for (const port of [2, 1, 0]) {
        await mark(p, C.PORTS[port], true);
        assert.equal(
          await p.locator(`[data-port='${port}']`).getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(await p.locator("#shot-count").textContent(), "0");
      }
      const a = await mapPoint(p, C.PORTS[0]);
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
      assert.equal(await p.locator("#check").isDisabled(), true);
      await p
        .locator(`[data-guess="0"][data-mass="${actual.massClass}"]`)
        .tap();
      assert.equal(await p.locator("#check").isEnabled(), true);
      await p.locator("#predict").tap();
      await p.screenshot({
        path: path.join(out, `mass-prediction-${width}.png`),
        fullPage: true,
      });
      await noOverflow(p);
      // A map arrow returns to launch mode without losing the hypothesis.
      await mark(p, C.PORTS[2], true);
      assert.equal(
        await p.locator("#aim-mode").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await p.locator("#shot-count").textContent(), "2");
      await p.locator("#mark-mode").tap();
      assert.equal(
        await p
          .locator(`[data-guess="0"][data-mass="${actual.massClass}"]`)
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await p.locator("#predict").getAttribute("aria-pressed"),
        "false",
      );
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
      assert.equal(
        await p.locator("#gravity-title").textContent(),
        "Sondas y gravedad",
      );
      assert.equal(
        await p.locator("#junior-title").textContent(),
        "Detectives de partículas",
      );
      await p.screenshot({
        path: path.join(out, `renamed-picker-${width}.png`),
        fullPage: true,
      });
      await p.locator('a[href="gravedad-oculta.html"]').tap();
      await p.waitForURL(gameURL);
      await p.locator("#start").waitFor({ state: "visible" });
      assert.equal(await p.locator("#start").isVisible(), true);
      assert.match(await p.title(), /Sondas y gravedad/);
      await p.goto(pathToFileURL(path.join(root, "trex-dm-junior.html")).href);
      assert.match(await p.title(), /Detectives de partículas/);
      await noOverflow(p);
      await p.screenshot({
        path: path.join(out, `renamed-junior-${width}.png`),
        fullPage: true,
      });
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
