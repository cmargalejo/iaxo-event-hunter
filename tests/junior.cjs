const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const url = pathToFileURL(path.join(root, "trex-dm-junior.html")).href;

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.JUNIOR_BROWSER_CHANNEL ? { channel: process.env.JUNIOR_BROWSER_CHANNEL } : {}) });
  const outcomes = new Set();
  try {
    for (const width of [1280, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
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
        if (process.env.JUNIOR_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.JUNIOR_SCREENSHOTS, name + "-" + width + ".png"), fullPage: true });
      };
      await checkLayout();
      for (const link of await page.locator("footer a").all()) assert.ok(fs.existsSync(path.join(root, await link.getAttribute("href"))));
      let previousTraces = "";
      let previousCount = 0;
      let previousOutcome = "";
      for (let round = 0; round < 3; round += 1) {
        await page.locator("#start").click();
        assert.equal(await page.getByRole("slider").inputValue(), "0");
        assert.equal(await page.locator("#to-guide").isVisible(), false);
        if (round === 0) {
          await page.getByRole("slider").focus();
          await page.keyboard.press("End");
        } else await page.locator("#lower").click();
        assert.equal(await page.getByRole("slider").inputValue(), "100");
        assert.match(await page.locator("#mountain-message").innerText(), /Aún quedan/);
        await page.locator("#to-guide").click();
        assert.equal(await page.locator("#guide .trace").count(), 2);
        await page.locator("#to-clues").click();
        assert.equal(await page.locator("#notebook-progress .done").count(), 0);
        const decisions = [];
        const compact = [];
        const traces = [];
        for (let i = 0; i < 6; i += 1) {
          assert.equal(await page.locator("#clue-label").textContent(), "Pista " + (i + 1) + " de 6");
          compact.push(/grupo pequeño/.test(await page.locator("#current-trace svg").getAttribute("aria-label")));
          traces.push(await page.locator("#current-trace").innerHTML());
          decisions.push(round === 0 && width === 390 ? false : round === 0 && width === 320 ? true : compact[i]);
          await page.locator(decisions[i] ? "#keep" : "#skip").click();
          assert.equal(await page.locator("#keep").isDisabled(), true);
          assert.equal(await page.locator("#skip").isDisabled(), true);
          if (compact[i] && decisions[i]) assert.match(await page.locator("#clue-feedback").innerText(), /neutrón/);
          await page.locator("#keep").dispatchEvent("click");
          assert.equal(await page.locator("#notebook-progress .done").count(), i + 1);
          await checkLayout();
          await page.locator("#next-clue").click();
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
          await page.locator("#investigate").click();
          assert.equal(await page.locator("#conclusion").isVisible(), true);
          assert.match(await page.locator("#notebook-feedback").innerText(), /misma regla/);
        }
        for (let i = 0; i < 6; i += 1) {
          assert.equal(await page.locator('.entry[data-index="' + i + '"] svg').evaluate((svg) => svg.outerHTML), traces[i]);
          if (decisions[i] !== compact[i]) await page.locator('[data-move="' + i + '"]').click();
        }
        assert.equal(await page.locator("#accepted-entries .entry").count(), count);
        assert.equal(await page.locator("#rejected-entries .entry").count(), 6 - count);
        assert.match(await page.locator("#accepted-title").innerText(), new RegExp(count + "$"));
        await checkLayout();
        if (round === 0) await screenshot("junior-notebook");
        await page.locator("#investigate").click();
        assert.equal(await page.locator("#comparison").isVisible(), true);
        const control = parseInt(await page.locator("#control-count").textContent(), 10);
        assert.equal(await page.locator("#sample-dots span").count(), count);
        assert.equal(await page.locator("#control-dots span").count(), control);
        const outcome = count > control ? "more" : count === control ? "same" : "less";
        outcomes.add(outcome);
        assert.notEqual(outcome, previousOutcome, "Consecutive outcomes must differ");
        previousOutcome = outcome;
        await page.locator('[data-comparison="' + (outcome === "more" ? "less" : "more") + '"]').click();
        assert.equal(await page.locator("#discovery-question").isVisible(), false);
        await page.locator('[data-comparison="' + outcome + '"]').click();
        assert.equal(await page.locator("#discovery-question").isVisible(), true);
        await checkLayout();
        if (round === 0) await screenshot("junior-comparison");
        await page.locator("#back-notebook").click();
        await page.locator("#investigate").click();
        assert.equal(parseInt(await page.locator("#control-count").textContent(), 10), control);
        await page.locator("#announce").click();
        assert.match(await page.locator("#conclusion-feedback").innerText(), /más pruebas/);
        await page.locator("#finish-investigation").click();
        assert.match(await page.locator("#round-result").innerText(), new RegExp(count + " pistas aceptadas frente a " + control));
        await checkLayout();
        await page.locator("#restart").click();
        assert.equal(await page.locator("#welcome").isVisible(), true);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    assert.deepEqual([...outcomes].sort(), ["less", "more", "same"]);
    console.log("Junior checks passed: nine randomized rounds at desktop/mobile/320px; separate notebook groups; stable drawings; correction and empty/full selections; all comparison outcomes; wrong answers; repeat protection; replay variation; keyboard and original links.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
