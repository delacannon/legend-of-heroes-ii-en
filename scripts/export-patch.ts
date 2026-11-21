/**
 * Builds public/patch/<lang>/ (manifest.json + one BPS per changed file) from Kizuato Studio's last
 * Legend of Heroes II builds (English and Spanish), then applies each to the original disk image as a check.
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
const SHORT = "EiyuuDensetsu2";
const version = "2026.11.21";
const META = {
  en: {
    title: "Dragon Slayer: The Legend of Heroes II — English translation",
    requires: "your own copy of Dragon Slayer: The Legend of Heroes II (Nihon Falcom, PC-98), hard-disk image (.hdi) with the ED2-98 folder",
    credits: ["The Legend of Heroes II EN", "Original game © 1992 Nihon Falcom.", "Made with Kizuato Studio"],
  },
  es: {
    title: "Dragon Slayer: The Legend of Heroes II — traducción al español",
    requires: "tu propia copia de Dragon Slayer: The Legend of Heroes II (Nihon Falcom, PC-98), imagen de disco duro (.hdi) con la carpeta ED2-98",
    credits: ["The Legend of Heroes II ES", "Juego original © 1992 Nihon Falcom.", "Hecho con Kizuato Studio"],
  },
} as const;

rmSync(OUT, { recursive: true, force: true });
let ok = true;
for (const lang of ["en", "es"] as const) {
  const B = join(PROJ, "build", lang), out = join(OUT, lang);
  mkdirSync(out, { recursive: true });
  const changed: string[] = JSON.parse(readFileSync(join(B, "changed.json"), "utf8"));
  const files = [];
  const pmap = new Map<string, Uint8Array>();
  for (const rel of changed) {
    const src = new Uint8Array(readFileSync(join(PROJ, "game", rel)));
    const tgt = new Uint8Array(readFileSync(join(B, "game", rel)));
    if (src.length === tgt.length && crc32(src) === crc32(tgt)) continue;
    const name = `${rel.replace(/\//g, "_")}.bps`;
    const bps = bpsEncode(src, tgt, `${SHORT} ${lang} ${rel}`);
    writeFileSync(join(out, name), bps);
    pmap.set(name, bps);
    files.push({ path: rel, patch: name, source: { size: src.length, crc32: hex32(crc32(src)) }, target: { size: tgt.length, crc32: hex32(crc32(tgt)) } });
  }
  const m = { format: "kizuato-re-patch/1" as const, game: SHORT, lang, version, created: new Date().toISOString(), ...META[lang], credits: [...META[lang].credits], files };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(m, null, 1));
  const first = patchDisk(m, new Uint8Array(readFileSync(ORIG)), pmap);
  const again = first.disk && patchDisk(m, first.disk, pmap);
  const pass = !!first.disk && first.results.every((r) => r.status === "patched") && !!again?.results.every((r) => r.status === "already");
  ok &&= pass;
  console.log(lang, files.length, "files", pass ? "VERIFY OK" : "VERIFY FAIL", first.results.filter((r) => r.status !== "patched").slice(0, 3));
}
if (!ok) process.exit(1);
