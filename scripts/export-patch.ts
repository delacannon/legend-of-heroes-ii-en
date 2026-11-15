/**
 * Builds public/patch/ (manifest.json + one BPS per changed file) from Kizuato Studio's last
 * Legend of Heroes II build, then applies it to the original disk image as a check.
 *
 * Usage: node scripts/export-patch.ts   (env ED2_PROJECT, ED2_HDI to override paths)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { bpsEncode, crc32, hex32 } from "../../../kizuato-re/engine/src/patch/bps.ts";
import { patchDisk } from "../src/components/patcher.ts";

const PROJ = process.env.ED2_PROJECT ?? join(homedir(), "kizuato-re/project-eiyuu2");
const ORIG = process.env.ED2_HDI ?? join(homedir(), "eiyuu2-re/orig/Eiyuu2.hdi");
const OUT = join(import.meta.dirname, "../public/patch");
const version = "2026.11.15";

const B = join(PROJ, "build/en");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const changed: string[] = JSON.parse(readFileSync(join(B, "changed.json"), "utf8"));
const files = [];
const pmap = new Map<string, Uint8Array>();
for (const rel of changed) {
  const src = new Uint8Array(readFileSync(join(PROJ, "game", rel)));
  const tgt = new Uint8Array(readFileSync(join(B, "game", rel)));
  if (src.length === tgt.length && crc32(src) === crc32(tgt)) continue;
  const name = `${rel.replace(/\//g, "_")}.bps`;
  const bps = bpsEncode(src, tgt, `EiyuuDensetsu2 en ${rel}`);
  writeFileSync(join(OUT, name), bps);
  pmap.set(name, bps);
  files.push({ path: rel, patch: name, source: { size: src.length, crc32: hex32(crc32(src)) }, target: { size: tgt.length, crc32: hex32(crc32(tgt)) } });
}
const m = {
  format: "kizuato-re-patch/1" as const, game: "EiyuuDensetsu2", lang: "en", version, created: new Date().toISOString(),
  title: "Dragon Slayer: The Legend of Heroes II — English translation",
  requires: "your own copy of Dragon Slayer: The Legend of Heroes II (Nihon Falcom, PC-98), hard-disk image (.hdi) with the ED2-98 folder",
  credits: ["The Legend of Heroes II EN", "Original game © 1992 Nihon Falcom.", "Made with Kizuato Studio"],
  files,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(m, null, 1));
const { disk, results } = patchDisk(m, new Uint8Array(readFileSync(ORIG)), pmap);
console.log(files.length, "files", disk ? "VERIFY OK" : "VERIFY FAIL", results.filter((r) => r.status !== "patched"));
if (!disk) process.exit(1);
