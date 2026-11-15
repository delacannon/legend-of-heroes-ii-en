export interface Track {
  name: string;
  url: string;
}

export interface SongFiles {
  name: string;
  file: string;
  url: string;
  size: number;
}

const base = import.meta.env.BASE_URL;

// name, then the VGM's byte size
const SONGS: { name: string; vgm: number }[] = [
  { name: "01 Opening", vgm: 509526 },
  { name: "02 Peace", vgm: 156598 },
  { name: "03 Slime Bullying", vgm: 51814 },
  { name: "04 Ship", vgm: 208458 },
  { name: "05 Castle", vgm: 115570 },
  { name: "06 Surprise", vgm: 41657 },
  { name: "07 Field", vgm: 106791 },
  { name: "08 Battle", vgm: 174159 },
  { name: "09 Game Over", vgm: 52744 },
  { name: "10 Underground Castle", vgm: 94733 },
  { name: "11 Selios' Departure", vgm: 74143 },
  { name: "12 Town", vgm: 211002 },
  { name: "13 Stopper", vgm: 141928 },
  { name: "14 Inside The Cave", vgm: 144909 },
  { name: "15 Underground Cave", vgm: 83600 },
  { name: "16 Underground Town", vgm: 167354 },
  { name: "17 Wrath of The Emperor", vgm: 45608 },
  { name: "18 Gail I", vgm: 89436 },
  { name: "19 Grostos Castle", vgm: 200400 },
  { name: "20 Barbara", vgm: 32896 },
  { name: "21 Resistance Hunting", vgm: 74156 },
  { name: "22 Underground Ruined Town", vgm: 179450 },
  { name: "23 Meeting", vgm: 158266 },
  { name: "24 Sortie", vgm: 136412 },
  { name: "25 Rushing", vgm: 81563 },
  { name: "26 Rushing 2", vgm: 273172 },
  { name: "27 Soldier's Flute", vgm: 2056 },
  { name: "28 Throne Room", vgm: 60152 },
  { name: "29 Battle with The Emperor", vgm: 184485 },
  { name: "30 Ending", vgm: 1229825 },
  { name: "31 Utility", vgm: 161558 },
  { name: "32 SE", vgm: 226156 },
];

export const songs: SongFiles[] = SONGS.map(({ name, vgm }) => {
  const file = `${name}.vgm`;
  return { name, file, url: `${base}music/${encodeURIComponent(file)}`, size: vgm };
});

export const tracks: Track[] = songs.map(({ name, url }) => ({ name, url }));
