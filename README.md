# The Legend of Heroes II EN / ES

3D box viewer for **Dragon Slayer: The Legend of Heroes II** (ドラゴンスレイヤー英雄伝説II, Nihon Falcom, 1992, PC-98), with the soundtrack and the English and Spanish translation patches.

**[Open the site](https://delacannon.github.io/legend-of-heroes-ii-en/)**

- 3D box: drag to orbit, wheel to zoom, `Space` to turn it, `L` to switch lighting
- Soundtrack player with a spectrum that reacts to the music
- 32 tracks to download as VGM
- Translation patch, English or Spanish: drop your own hard-disk image (`.hdi` / `.nhd`, with the `ED2-98` folder) on the page, a patched copy is saved. Nothing is uploaded and your original is not changed

The patch contains no game data: you need your own copy of the game.

## Run it

```sh
pnpm install --ignore-workspace
pnpm dev
```

The built site lives on the `gh-pages` branch.

## Rebuild the patch

From the last Kizuato Studio builds of `~/kizuato-re/project-eiyuu2` (both languages), verified against the original disk:

```sh
pnpm patch:export
```

## Support

If you enjoy these PC-98 translations: [ko-fi.com/alammo](https://ko-fi.com/alammo)
