import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const files = [
  new URL("../app/page.tsx", import.meta.url),
  new URL("../app/layout.tsx", import.meta.url),
  new URL("../public/data/provisiones.json", import.meta.url),
];

test("la interfaz conserva español latino en UTF-8", async () => {
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /Ã|Â|â€|�/, `Codificación inválida en ${file.pathname}`);
  }
});
