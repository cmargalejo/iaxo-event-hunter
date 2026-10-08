const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ESLint } = require("eslint");
const prettier = require("prettier");

async function main() {
  for (const name of ["index.html", "trex-dm.html", "materia-oscura.html"]) {
    const file = path.join(__dirname, "..", name);
    const html = fs.readFileSync(file, "utf8");
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.ok(
      await prettier.check(html, { parser: "html" }),
      "Run npm run format",
    );
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${name}: HTML IDs must be unique`,
    );
    for (const [, id] of script.matchAll(/ui\.([A-Za-z]\w*)/g)) {
      assert.ok(
        ids.includes(id),
        `${name}: DOM reference does not exist: #${id}`,
      );
    }
    for (const [, id] of script.matchAll(/showScreen\("([^"]+)"/g)) {
      assert.ok(ids.includes(id), `${name}: screen does not exist: #${id}`);
    }
    assert.doesNotMatch(
      html,
      /\son\w+=/,
      "Use addEventListener instead of inline handlers",
    );
    if (name === "index.html") {
      assert.doesNotMatch(
        script,
        /\b(?:morphCount|posCount|showEnergy|confirmPosition)\b/,
      );
    }
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: {
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "script",
          globals: {
            document: "readonly",
            window: "readonly",
            setTimeout: "readonly",
            clearTimeout: "readonly",
          },
        },
        rules: {
          "no-undef": "error",
          "no-unused-vars": ["error", { args: "all" }],
          "no-unreachable": "error",
          "no-dupe-args": "error",
          "no-dupe-keys": "error",
          "no-duplicate-case": "error",
          "no-redeclare": "error",
          "no-func-assign": "error",
          "no-const-assign": "error",
          "no-constant-condition": ["error", { checkLoops: false }],
          "no-self-assign": "error",
          "no-sparse-arrays": "error",
          "valid-typeof": "error",
          "no-shadow": "error",
          "prefer-const": "error",
          eqeqeq: "error",
        },
      },
    });
    const results = await eslint.lintText(script, { filePath: "game.js" });
    const formatter = await eslint.loadFormatter("stylish");
    assert.equal(results[0].errorCount, 0, formatter.format(results));
  }
  console.log(
    "Static checks passed for all pages: unique IDs, DOM references, JavaScript and formatting valid.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
