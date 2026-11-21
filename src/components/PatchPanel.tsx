import { useRef, useState, type DragEvent } from 'react';
import { patchDisk, type PatchManifest, type PatchResult } from './patcher';

const VERSION = '2026.11.21';
const GAME = 'The Legend of Heroes II';
const FULL_NAME = 'Dragon Slayer: The Legend of Heroes II (Nihon Falcom, 1992)';
const GAME_DIR = 'ED2-98';

type Lang = 'en' | 'es';

/** Every UI string of the panel, in the language of the patch picked. */
const TEXT = {
  en: {
    label: 'English',
    title: 'Translation Patch',
    version: 'Version',
    intro: `Play ${GAME} in English. You need your own hard-disk copy of the game.`,
    appliesTo: 'Applies to',
    hdd: `PC-98 hard-disk version (${GAME_DIR} folder)`,
    tested: 'Tested',
    testedHow: 'On emulator only',
    drop: 'Drop disk image here',
    dropHint: '.hdi / .nhd, or click to choose',
    patching: (n: string) => `Patching ${n}…`,
    wait: 'Please wait',
    local: 'Stays on your computer: nothing is uploaded. Your original image is not changed.',
    patched: 'Patched',
    saved: 'saved to your downloads.',
    already: 'Already patched',
    mount: 'Mount this image as it is.',
    notImage: (n: string) => `${n} is not a .hdi or .nhd hard-disk image.`,
    notOriginal:
      'Nothing was written: this is not the original disk (an image already patched to the other language does not work: start from the original).',
    statusPatched: 'patched',
    statusAlready: 'already patched',
    thenMount: 'Then mount it',
    np21: 'HardDisk → IDE #0 → Open…, then Emulate → Reset',
    t98: 'mount as first hard disk (.nhd), then reset',
    any: 'drop the image on the window',
    note: 'Start a new game: old Japanese saves may still show some Japanese text.',
    kofi: '♥ Support on Ko-fi',
    close: 'Close patch panel',
    open: 'EN / ES Patch',
  },
  es: {
    label: 'Español',
    title: 'Parche de traducción',
    version: 'Versión',
    intro: `Juega a ${GAME} en español. Necesitas tu propia copia del juego instalada en disco duro.`,
    appliesTo: 'Para',
    hdd: `Versión PC-98 de disco duro (carpeta ${GAME_DIR})`,
    tested: 'Probado',
    testedHow: 'Solo en emulador',
    drop: 'Suelta aquí la imagen de disco',
    dropHint: '.hdi / .nhd, o haz clic para elegirla',
    patching: (n: string) => `Parcheando ${n}…`,
    wait: 'Espera un momento',
    local: 'Todo ocurre en tu ordenador: no se sube nada. La imagen original no se modifica.',
    patched: 'Hecho',
    saved: 'guardado en tus descargas.',
    already: 'Ya parcheado',
    mount: 'Monta esta imagen tal cual.',
    notImage: (n: string) => `${n} no es una imagen de disco duro .hdi o .nhd.`,
    notOriginal:
      'No se ha escrito nada: este no es el disco original (una imagen ya traducida al otro idioma no sirve: empieza desde la original).',
    statusPatched: 'aplicado',
    statusAlready: 'ya aplicado',
    thenMount: 'Después, móntala',
    np21: 'HardDisk → IDE #0 → Open…, y después Emulate → Reset',
    t98: 'móntala como primer disco duro (.nhd) y reinicia',
    any: 'suelta la imagen en la ventana',
    note: 'Empieza una partida nueva: las partidas japonesas guardadas pueden mostrar texto en japonés.',
    kofi: '♥ Apóyame en Ko-fi',
    close: 'Cerrar el panel del parche',
    open: 'Parche EN / ES',
  },
} as const;

const LANGS: Lang[] = ['en', 'es'];
const baseOf = (lang: Lang) => `${import.meta.env.BASE_URL}patch/${lang}/`;
const IMAGE = /\.(hdi|nhd)$/i;

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; name: string }
  | { kind: 'done'; name: string; results: PatchResult[] }
  | { kind: 'already'; results: PatchResult[] }
  | { kind: 'failed'; message: string; results: PatchResult[] };

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`cannot load ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function save(data: Uint8Array, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data as BlobPart]));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

async function run(file: File, lang: Lang): Promise<Status> {
  const base = baseOf(lang);
  const manifest = (await (await fetch(`${base}manifest.json`)).json()) as PatchManifest;
  const entries = await Promise.all(
    manifest.files.map(async (f) => [f.patch, await fetchBytes(`${base}${f.patch}`)] as const),
  );
  const { disk, results } = patchDisk(manifest, new Uint8Array(await file.arrayBuffer()), new Map(entries));
  if (!disk) return { kind: 'failed', message: TEXT[lang].notOriginal, results };
  if (results.every((r) => r.status === 'already')) return { kind: 'already', results };
  const name = file.name.replace(/(\.[^.]+)$/, `-${manifest.lang}$1`);
  save(disk, name);
  return { kind: 'done', name, results };
}

function ResultList({ results, lang }: { results: PatchResult[]; lang: Lang }) {
  const t = TEXT[lang];
  if (!results.length) return null;
  return (
    <ul className="patch-results">
      {results.map(({ path, status, error }) => (
        <li key={path} className={status}>
          {path.split('/').pop()}
          <span>{status === 'error' ? error : status === 'already' ? t.statusAlready : t.statusPatched}</span>
        </li>
      ))}
    </ul>
  );
}

/** The translation patch (English or Spanish); starts collapsed where it would cover the box. */
export function PatchPanel() {
  const [open, setOpen] = useState(() => !matchMedia('(max-width: 1100px)').matches);
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('es') ? 'es' : 'en'));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = TEXT[lang];

  const patch = async (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE.test(file.name)) {
      setStatus({ kind: 'failed', message: t.notImage(file.name), results: [] });
      return;
    }
    setStatus({ kind: 'working', name: file.name });
    await new Promise((resolve) => setTimeout(resolve, 20)); // let "Patching…" paint
    try {
      setStatus(await run(file, lang));
    } catch (e) {
      setStatus({ kind: 'failed', message: (e as Error).message, results: [] });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void patch(e.dataTransfer.files[0]);
  };

  if (!open) {
    return (
      <button className="side-open right" onClick={() => setOpen(true)}>
        {t.open}
      </button>
    );
  }

  const working = status.kind === 'working';
  return (
    <aside className="side-panel right" aria-label={t.title} lang={lang}>
      <header className="side-header">
        <div>
          <h2>{t.title}</h2>
          <p>
            {t.version} {VERSION}
          </p>
        </div>
        <button aria-label={t.close} title={t.close} onClick={() => setOpen(false)}>
          ×
        </button>
      </header>
      <div className="patch-body">
        <div className="patch-langs" role="radiogroup" aria-label="Language">
          {LANGS.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={lang === id}
              disabled={working}
              onClick={() => {
                setLang(id);
                setStatus({ kind: 'idle' });
              }}
            >
              {TEXT[id].label}
            </button>
          ))}
        </div>
        <p>{t.intro}</p>
        <dl className="patch-applies">
          <dt>{t.appliesTo}</dt>
          <dd>
            {FULL_NAME}
            <br />
            {t.hdd}
          </dd>
          <dt>{t.tested}</dt>
          <dd>{t.testedHow}</dd>
        </dl>
        <button
          className={over ? 'patch-drop over' : 'patch-drop'}
          disabled={working}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          {working ? t.patching(status.name) : t.drop}
          <small>{working ? t.wait : t.dropHint}</small>
        </button>
        <input
          ref={input}
          type="file"
          accept=".hdi,.nhd"
          hidden
          onChange={(e) => {
            void patch(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="patch-note">{t.local}</p>

        {status.kind === 'done' && (
          <div className="patch-status done" role="status">
            <b>{t.patched}</b> {status.name} {t.saved}
            <ResultList results={status.results} lang={lang} />
          </div>
        )}
        {status.kind === 'already' && (
          <div className="patch-status" role="status">
            <b>{t.already}</b> {t.mount}
            <ResultList results={status.results} lang={lang} />
          </div>
        )}
        {status.kind === 'failed' && (
          <div className="patch-status failed" role="alert">
            {status.message}
            <ResultList results={status.results} lang={lang} />
          </div>
        )}

        <h3>{t.thenMount}</h3>
        <ul>
          <li>
            <b>np21w:</b> {t.np21}
          </li>
          <li>
            <b>T98-Next:</b> {t.t98}
          </li>
          <li>
            <b>anyPC98:</b> {t.any}
          </li>
        </ul>

        <p className="patch-note">{t.note}</p>

        <a className="patch-kofi" href="https://ko-fi.com/alammo" target="_blank" rel="noreferrer">
          {t.kofi}
        </a>
      </div>
    </aside>
  );
}
