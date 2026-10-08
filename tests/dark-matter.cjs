const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `file://${path.join(__dirname, "..", "materia-oscura.html")}`,
  );

  await page.locator('[data-open="rotation"]').click();
  await page.locator("#haloSlider").fill("100");
  await page.getByText("¡Encaja!").waitFor();
  await page.locator(".back:visible").click();

  await page.locator('[data-open="lens"]').click();
  await page.locator("#lensSlider").fill("79");
  await page.getByText("¡Has encontrado la pista!").waitFor();
  await page.locator(".back:visible").click();

  await page.locator('[data-open="lab"]').click();
  await page.locator('[data-upgrade="time"] [data-change="1"]').click();
  await page.locator('[data-upgrade="quiet"] [data-change="1"]').click();
  await page.locator("#runDetector").click();
  await page.getByText("Tu diseño:").waitFor();
  await page.locator("#resetDetector").click();
  assert.equal(await page.locator("#budgetLeft").textContent(), "6");
  await page.locator(".back:visible").click();

  await page.locator('[data-open="route"]').click();
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-answer="0"]').click();
    await page.waitForTimeout(950);
  }
  await page.getByText("¡Misión completada!").waitFor();
  assert.deepEqual(errors, []);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".back:visible").click();
  assert.equal(await page.locator(".gameCard").count(), 4);
  await browser.close();
  console.log(
    "Dark matter browser checks passed: all four games, controls, mission completion and mobile menu.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
