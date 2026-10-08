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
      assert.equal(
        await page
          .getByRole("link", { name: "IAXO Event Hunter" })
          .getAttribute("href"),
        "./",
      );
      await page.getByRole("button", { name: "EMPEZAR" }).click();
      assert.match(
        await page.locator("#lesson").innerText(),
        /Los WIMPs son partículas hipotéticas/,
      );
      await page.getByRole("button", { name: "VER LOS EVENTOS" }).click();
      assert.equal(await page.locator("#backgroundIntro").isVisible(), true);
      assert.equal(await page.locator(".eventExample canvas").count(), 6);
      const galleryGrid = await page
        .locator(".eventExamples")
        .evaluate((grid) => {
          const style = getComputedStyle(grid);
          return {
            columns: style.gridTemplateColumns.split(" ").length,
            rows: style.gridTemplateRows.split(" ").length,
          };
        });
      assert.deepEqual(
        galleryGrid,
        width <= 720 ? { columns: 2, rows: 3 } : { columns: 3, rows: 2 },
      );
      assert.match(
        await page.locator("#backgroundIntro").innerText(),
        /neutrones.*parecerse/i,
      );
      await page.getByRole("button", { name: "ENTRENAR", exact: true }).click();
      for (let i = 0; i < 6; i++) {
        const examples = [
          "retroceso compacto",
          "trazo de electrón",
          "rastro largo de muón",
          "trazo denso de alfa",
          "retroceso compacto de neutrón",
          "varios depósitos",
        ];
        assert.equal(
          await page.locator("#trainCount").textContent(),
          `Ejemplo ${i + 1} de 6: ${examples[i]}. ${i === 0 || i === 4 ? "Puede ser una huella candidata." : "Parece una huella de fondo."}`,
        );
        await page.getByRole("button", { name: "SIGUIENTE EJEMPLO" }).click();
      }
      const shapes = new Set();
      const eventTotal = Number(
        await page.locator("#eventTotal").textContent(),
      );
      assert.ok(eventTotal >= 10 && eventTotal <= 14);
      let candidateCount = 0;
      let correctCount = 0;
      for (let i = 0; i < eventTotal; i++) {
        assert.equal(
          await page.locator("#eventNumber").textContent(),
          String(i + 1),
        );
        const shape = await page
          .locator("#eventCanvas")
          .getAttribute("aria-label");
        shapes.add(shape);
        const isCandidate = i % 2 === 0;
        if (isCandidate) candidateCount++;
        const answer = page.locator(isCandidate ? "#candidate" : "#background");
        await answer.click();
        if (
          (await page.locator("#feedback").getAttribute("class")).includes(
            "good",
          )
        )
          correctCount++;
        assert.notEqual(
          (await page.locator("#feedback").innerText()).trim(),
          "",
        );
        await page.getByRole("button", { name: "SIGUIENTE EVENTO" }).click();
      }
      assert.ok(shapes.size >= 5, "A round should contain varied event shapes");
      assert.equal(
        await page.locator("#roundEventCount").textContent(),
        String(eventTotal),
      );
      assert.equal(
        await page.locator("#roundCandidateCount").textContent(),
        String(candidateCount),
      );
      assert.equal(
        await page.locator("#roundCorrectCount").textContent(),
        `${correctCount}/${eventTotal}`,
      );
      assert.match(
        await page.locator("#roundSummary").innerText(),
        /partida simulada/i,
      );
      for (const [index, classification] of [
        "background",
        "hint",
        "hint",
      ].entries()) {
        assert.equal(
          await page.locator("#caseNumber").textContent(),
          String(index + 1),
        );
        assert.equal(
          await page.locator("#observedCount").textContent(),
          ["10", "15", "31"][index],
        );
        await page.locator(`[data-conclusion="${classification}"]`).click();
        assert.match(
          await page.locator("#caseFeedback").innerText(),
          /¡Bien razonado!/,
        );
        await page.getByRole("button", { name: "SIGUIENTE CASO" }).click();
      }
      await page
        .getByRole("button", { name: "AÚN NO: HAY QUE COMPROBARLO" })
        .click();
      assert.match(
        await page.locator("#decisionFeedback").innerText(),
        /comprobaciones/,
      );
      await page.getByRole("button", { name: "VER RESULTADO" }).click();
      assert.match(
        await page.locator("#resultTitle").innerText(),
        /decisiones acertadas/,
      );
      assert.match(
        await page.locator("#resultText").innerText(),
        /no se ha descubierto materia oscura/,
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
