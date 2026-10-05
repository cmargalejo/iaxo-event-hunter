const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const url =
  process.env.GAME_URL ||
  pathToFileURL(path.join(__dirname, "..", "index.html")).href;
const coveredSelectors = new Set();

async function auditDOM(page) {
  const audit = await page.evaluate(() => {
    const selectors = [];
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.type === CSSRule.STYLE_RULE) selectors.push(rule.selectorText);
        else if (rule.type === CSSRule.MEDIA_RULE) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
    return {
      selectors,
      matched: selectors.filter((selector) => document.querySelector(selector)),
    };
  });
  for (const selector of audit.matched) coveredSelectors.add(selector);
  return audit.selectors;
}

async function openGame(browser, seed, width = 1365) {
  const context = await browser.newContext({
    viewport: { width, height: 950 },
  });
  await context.addInitScript((initialSeed) => {
    let state = initialSeed;
    Math.random = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => errors.push(request.url()));
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  const response = await page.goto(url);
  assert.equal(response.status(), 200);
  assert.equal(
    (await response.body()).toString(),
    html,
    "Served HTML must match the working copy",
  );
  assert.equal(
    await page
      .locator(".brand img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
  );
  return { page, errors, context };
}

async function playRound(
  page,
  { repeatedInput = false, keyboard = false } = {},
) {
  await page.locator("#intro").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "EMPEZAR", exact: true }).click();
  await page.locator("#backgroundIntro").waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "¿Qué es el foco?" }).waitFor();
  assert.match(
    await page.locator(".opticsLesson").innerText(),
    /punto pequeño/,
  );
  assert.match(
    await page.locator(".opticsLesson").innerText(),
    /por casualidad/,
  );
  assert.equal(
    await page.locator(".opticsDiagram svg").getAttribute("role"),
    "img",
  );
  assert.equal(
    await page
      .locator("#backgroundIntro")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
    "Optics explanation must fit on mobile",
  );
  await page.getByRole("button", { name: "ENTRENAR", exact: true }).click();
  for (let i = 0; i < 6; i++) {
    assert.equal(
      await page.locator("#trainCount").textContent(),
      `Ejemplo ${i + 1} de 6`,
    );
    await page.getByRole("button", { name: "SIGUIENTE", exact: true }).click();
  }
  let correct = 0;
  for (let i = 0; i < 12; i++) {
    assert.equal(await page.locator("#testN").textContent(), String(i + 1));
    const button = page.locator(i % 2 ? "#backgroundButton" : "#xrayButton");
    await button.click();
    const feedback = await page.locator("#feedback").textContent();
    if (feedback.includes("¡CORRECTO!")) correct++;
    assert.equal(await page.locator("#test button:disabled").count(), 2);
    if (repeatedInput) {
      // Bypass the native disabled button to verify the handler itself rejects queued input.
      await button.dispatchEvent("click");
      await button.dispatchEvent("click");
      assert.equal(await page.locator("#feedback").textContent(), feedback);
    }
    await auditDOM(page);
    await page.clock.runFor(1200);
  }
  await page.locator("#position").waitFor({ state: "visible" });
  const dots = page.locator("#detector .dot");
  assert.equal(await dots.count(), 12);
  const candidates = await dots.evaluateAll((nodes) =>
    nodes.flatMap((dot, index) => {
      if (!dot.classList.contains("clickable")) return [];
      const x = parseFloat(dot.style.left) * 0.6 - 30;
      const y = parseFloat(dot.style.top) * 0.6 - 30;
      return [{ index, inside: Math.hypot(x, y) <= 10 }];
    }),
  );
  if (candidates.length) {
    const first = dots.nth(candidates[0].index);
    assert.equal(await first.getAttribute("aria-pressed"), "false");
    if (keyboard) {
      await first.focus();
      await first.press("Enter");
      await auditDOM(page);
      assert.equal(await first.getAttribute("aria-pressed"), "true");
      await first.press("Space");
      await first.dispatchEvent("keydown", { key: " ", repeat: true });
    } else {
      await first.click();
      assert.equal(await first.getAttribute("aria-pressed"), "true");
      await first.click();
    }
    assert.equal(await first.getAttribute("aria-pressed"), "false");
  }
  for (const candidate of candidates) {
    if (candidate.inside) await dots.nth(candidate.index).click();
  }
  await auditDOM(page);
  const inside = candidates.filter((candidate) => candidate.inside).length;
  assert.equal(await page.locator(".dot.keep").count(), inside);
  await page
    .getByRole("button", { name: "COMPARAR CON EL FONDO", exact: true })
    .click();
  await page.locator("#result").waitFor({ state: "visible" });
  assert.equal(await page.locator("#score").textContent(), `${correct}/12`);
  assert.equal(
    await page.locator("#positionScore").textContent(),
    `${candidates.length}/${candidates.length}`,
  );
  assert.equal(await page.locator("#inside").textContent(), String(inside));
  assert.equal(await page.locator("#hist .barwrap").count(), 7);
  assert.equal(await page.locator("#hist .youmarker").count(), 1);
  assert.doesNotMatch(
    await page.locator("#result").innerText(),
    /NaN|undefined|Infinity/,
  );
  const selectors = await auditDOM(page);
  await page
    .getByRole("button", { name: "JUGAR OTRA VEZ", exact: true })
    .click();
  await page.locator("#intro").waitFor({ state: "visible" });
  return { candidates: candidates.length, inside, selectors };
}

async function checkHistogram(page) {
  // Isolate the production renderer and supply controlled simulations. No test hooks ship in the game.
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const start = script.indexOf("function renderBackgroundHist(");
  const end = script.indexOf("function restart(", start);
  assert.ok(start >= 0 && end > start);
  const functionSource = script.slice(start, end);
  const result = await page.evaluate((source) => {
    const ui = {
      hist: document.getElementById("hist"),
      sessionText: document.getElementById("sessionText"),
    };
    const render = new Function(
      "ui",
      "poisson",
      `${source}; renderBackgroundHist(7);`,
    );
    render(ui, () => 6);
    const below = ui.sessionText.textContent;
    const grouped =
      ui.hist.lastElementChild.querySelector(".barvalue").textContent;
    render(ui, () => 7);
    return { below, grouped, atThreshold: ui.sessionText.textContent };
  }, functionSource);
  assert.match(result.below, /aproximadamente 0%/);
  assert.equal(
    result.grouped,
    "100%",
    "All events belong to the 6+ display bin",
  );
  assert.match(result.atThreshold, /aproximadamente 100%/);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openGame(browser, 123456789);
    const first = await playRound(desktop.page, {
      repeatedInput: true,
      keyboard: true,
    });
    assert.ok(first.candidates > 0 && first.inside > 0);
    await playRound(desktop.page);
    await checkHistogram(desktop.page);
    assert.deepEqual(desktop.errors, []);
    await desktop.context.close();
    const mobile = await openGame(browser, 2, 390);
    const empty = await playRound(mobile.page);
    assert.equal(
      empty.candidates,
      0,
      "Seed 2 must exercise the empty candidate path",
    );
    assert.deepEqual(mobile.errors, []);
    await mobile.context.close();
    const untested = first.selectors.filter(
      (selector) => !coveredSelectors.has(selector),
    );
    assert.deepEqual(untested, [], "Unused or untested CSS selectors");
    console.log(
      `Browser checks passed: desktop/mobile, repeated input, keyboard, consecutive rounds, zero candidates, 6+ histogram tail and ${coveredSelectors.size} CSS selectors. No JavaScript/resource errors.`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
