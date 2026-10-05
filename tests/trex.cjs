const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const html = fs.readFileSync(
  path.join(__dirname, "..", "trex-dm.html"),
  "utf8",
);
const url = pathToFileURL(path.join(__dirname, "..", "trex-dm.html")).href;

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1365, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url);
      await page.getByRole("button", { name: "EMPEZAR" }).click();
      assert.match(
        await page.locator("#lesson").innerText(),
        /Los WIMPs son partículas hipotéticas/,
      );
      await page.getByRole("button", { name: "APRENDER A MIRAR" }).click();
      for (let i = 0; i < 5; i++) {
        assert.equal(
          await page.locator("#trainCount").textContent(),
          `Ejemplo ${i + 1} de 5`,
        );
        await page.getByRole("button", { name: "SIGUIENTE EJEMPLO" }).click();
      }
      for (const isCandidate of [
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
      ]) {
        const answer = page.locator(isCandidate ? "#candidate" : "#background");
        await answer.click();
        assert.notEqual(
          (await page.locator("#feedback").innerText()).trim(),
          "",
        );
        await page.getByRole("button", { name: "SIGUIENTE EVENTO" }).click();
      }
      assert.equal(
        await page.locator("#resultTitle").textContent(),
        "10 de 10 aciertos",
      );
      assert.match(
        await page.locator("#result").innerText(),
        /no es un descubrimiento/i,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "TREX-DM browser checks passed: desktop/mobile, training, all event decisions, cautious result copy and no JavaScript errors.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
