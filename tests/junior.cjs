const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const url = pathToFileURL(path.join(root, "trex-dm-junior.html")).href;

async function main() {
  assert.doesNotMatch(fs.readFileSync(path.join(root, "trex-dm-junior.html"), "utf8"), /\bfondo\b/i);
  const browser = await chromium.launch({ headless: true, ...(process.env.JUNIOR_BROWSER_CHANNEL ? { channel: process.env.JUNIOR_BROWSER_CHANNEL } : {}) });
  const outcomes = new Set();
  const screenshotDir = process.env.JUNIOR_SCREENSHOTS || process.argv[2];
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  try {
    for (const width of [1280, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 1280, isMobile: width < 1280, reducedMotion: "reduce" });
      const touch = width < 1280 ? await page.context().newCDPSession(page) : null;
      const activate = async (locator) => {
        if (touch) await locator.tap();
        else await locator.click();
      };
      const dragTrace = async (destination, cancel = false) => {
        await page.locator("#current-trace").scrollIntoViewIfNeeded();
        const source = await page.locator("#current-trace").boundingBox();
        const target = destination ? await page.locator(destination).boundingBox() : { x: 2, y: 2, width: 10, height: 10 };
        const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
        const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
        if (touch) await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
        else { await page.mouse.move(start.x, start.y); await page.mouse.down(); }
        for (let step = 1; step <= 8; step += 1) {
          const point = { x: start.x + (end.x - start.x) * step / 8, y: start.y + (end.y - start.y) * step / 8 };
          if (touch) await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
          else await page.mouse.move(point.x, point.y);
          // Realistic finger speed avoids Chromium treating instantaneous moves as a fling.
          if (touch) await page.waitForTimeout(40);
        }
        assert.equal(await page.locator(".drag-preview").count(), 1);
        if (destination) {
          await page.waitForFunction((selector) => document.querySelector(selector).classList.contains("drop-target"), destination, { timeout: 2000 });
        }
        if (cancel && !touch) await page.keyboard.press("Escape");
        if (touch) await touch.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
        else await page.mouse.up();
        assert.equal(await page.locator(".drag-preview, .drop-target").count(), 0);
      };
      await page.addInitScript((initial) => {
        let state = initial;
        Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      }, width);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url);
      const checkLayout = async () => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator("main > section:visible").count(), 1);
      };
      const screenshot = async (name) => {
        if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, name + "-" + width + ".png"), fullPage: true });
      };
      await checkLayout();
      for (const link of await page.locator("footer a").all()) assert.ok(fs.existsSync(path.join(root, await link.getAttribute("href"))));
      let previousTraces = "";
      let previousCount = 0;
      let previousOutcome = "";
      for (let round = 0; round < 3; round += 1) {
        await activate(page.locator("#start"));
        assert.equal(await page.getByRole("slider").inputValue(), "0");
        assert.equal(await page.locator("#to-guide").isVisible(), false);
        if (round === 0) {
          await page.getByRole("slider").focus();
          await page.keyboard.press("End");
        } else await activate(page.locator("#lower"));
        assert.equal(await page.getByRole("slider").inputValue(), "100");
        assert.match(await page.locator("#mountain-message").innerText(), /Aún quedan/);
        await activate(page.locator("#to-guide"));
        assert.equal(await page.locator("#guide .trace").count(), 2);
        await activate(page.locator("#to-clues"));
        assert.equal(await page.locator("#notebook-progress .done").count(), 0);
        if (round === 0) await screenshot("junior-sorting");
        const decisions = [];
        const compact = [];
        const traces = [];
        for (let i = 0; i < 6; i += 1) {
          assert.equal(await page.locator("#clue-label").textContent(), "Pista " + (i + 1) + " de 6");
          compact.push(/grupo pequeño/.test(await page.locator("#current-trace svg").getAttribute("aria-label")));
          traces.push(await page.locator("#current-trace").innerHTML());
          decisions.push(round === 0 && width === 390 ? false : round === 0 && width === 320 ? true : compact[i]);
          if (i === 0 && round === 0) {
            await dragTrace(null);
            await dragTrace("#keep", true);
            assert.equal(await page.locator("#notebook-progress .done").count(), 0);
            assert.equal(await page.locator("#keep").isEnabled(), true);
          }
          if (i % 2 === 0) await dragTrace(decisions[i] ? "#keep" : "#skip");
          else if (width === 1280) {
            await page.locator(decisions[i] ? "#keep" : "#skip").focus();
            await page.keyboard.press("Enter");
          } else await activate(page.locator(decisions[i] ? "#keep" : "#skip"));
          await page.waitForFunction(() => document.getElementById("keep").disabled, null, { timeout: 3000 });
          assert.equal(await page.locator("#keep").isDisabled(), true, `Choice not recorded: width ${width}, round ${round}, clue ${i}`);
          assert.equal(await page.locator("#skip").isDisabled(), true);
          if (compact[i] && decisions[i]) assert.match(await page.locator("#clue-feedback").innerText(), /Otras partículas/);
          await page.locator("#keep").dispatchEvent("click");
          assert.equal(await page.locator("#notebook-progress .done").count(), i + 1);
          await checkLayout();
          await activate(page.locator("#next-clue"));
        }
        const count = compact.filter(Boolean).length;
        assert.ok(count >= 2 && count <= 4);
        assert.notEqual(count, previousCount, "New round must change compact count");
        assert.notEqual(traces.join(""), previousTraces, "New round must change drawings");
        previousCount = count;
        previousTraces = traces.join("");
        assert.equal(await page.locator(".entry").count(), 6);
        assert.equal(await page.locator("#accepted-entries .entry").count(), decisions.filter(Boolean).length);
        assert.equal(await page.locator("#rejected-entries .entry").count(), 6 - decisions.filter(Boolean).length);
        if (round === 0 && width !== 1280) {
          assert.equal(await page.locator(".empty").count(), 1);
          await activate(page.locator("#investigate"));
          assert.equal(await page.locator("#conclusion").isVisible(), true);
          assert.match(await page.locator("#notebook-feedback").innerText(), /misma regla/);
        }
        for (let i = 0; i < 6; i += 1) {
          assert.equal(await page.locator('.entry[data-index="' + i + '"] svg').evaluate((svg) => svg.outerHTML), traces[i]);
          if (decisions[i] !== compact[i]) await activate(page.locator('[data-move="' + i + '"]'));
        }
        assert.equal(await page.locator("#accepted-entries .entry").count(), count);
        assert.equal(await page.locator("#rejected-entries .entry").count(), 6 - count);
        assert.match(await page.locator("#accepted-title").innerText(), new RegExp(count + "$"));
        await checkLayout();
        if (round === 0) await screenshot("junior-notebook");
        await activate(page.locator("#investigate"));
        assert.equal(await page.locator("#comparison").isVisible(), true);
        const expected = parseInt(await page.locator("#expected-count").textContent(), 10);
        assert.equal(expected, 3, "The illustrative expectation stays fixed across decisions and rounds");
        assert.equal(parseInt(await page.locator("#sample-count").textContent(), 10), count);
        assert.equal(await page.locator("#sample-dots span").count(), count);
        assert.equal(await page.locator("#expected-dots span").count(), expected);
        assert.equal(await page.locator(".sample-dots button").count(), 0);
        assert.equal(await page.locator("[data-comparison]:disabled").count(), 0, "Compare immediately, without counting clicks");
        if (round === 0) await screenshot("junior-counts");
        const outcome = count > expected ? "more" : count === expected ? "same" : "less";
        outcomes.add(outcome);
        assert.notEqual(outcome, previousOutcome, "Consecutive outcomes must differ");
        previousOutcome = outcome;
        await activate(page.locator('[data-comparison="' + (outcome === "more" ? "less" : "more") + '"]'));
        assert.equal(await page.locator("#discovery-question").isVisible(), false);
        await activate(page.locator('[data-comparison="' + outcome + '"]'));
        assert.equal(await page.locator("#discovery-question").isVisible(), true);
        await checkLayout();
        if (round === 0) await screenshot("junior-comparison");
        await activate(page.locator("#back-notebook"));
        await activate(page.locator("#investigate"));
        assert.equal(parseInt(await page.locator("#expected-count").textContent(), 10), expected);
        assert.equal(parseInt(await page.locator("#sample-count").textContent(), 10), count);
        await activate(page.locator("#announce"));
        assert.match(await page.locator("#conclusion-feedback").innerText(), /más pruebas/);
        await activate(page.locator("#finish-investigation"));
        assert.match(await page.locator("#round-result").innerText(), new RegExp("Has guardado " + count + " pistas. Esperábamos " + expected));
        await checkLayout();
        await activate(page.locator("#restart"));
        assert.equal(await page.locator("#welcome").isVisible(), true);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    assert.deepEqual([...outcomes].sort(), ["less", "more", "same"]);
    console.log("Junior checks passed: nine rounds at desktop/mobile/320px; mouse/touch dragging and cancellation; keyboard/tap alternatives; immediate counts and visual comparison; stable counts and drawings; notebook corrections; all comparison outcomes; replay resets; no background jargon.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
