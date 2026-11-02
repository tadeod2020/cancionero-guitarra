import { validateAndNormalizeSong } from './domain.js';

export const STORAGE_KEY = 'cancionero_guitarra_v1';

export const DEFAULT_SONGS = [
  {
    id: 'seed_musica_ligera',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    mastery: 'mastered',
    readyToSing: true,
    capo: 0,
    key: 'Bm',
    strumming: '↓↓ ↑↑ ↓↑ (Con acento en 2 y 4)',
    notes: 'Riff principal toda la canción. Mantener ritmo firme en el rasgueo.',
    sections: [
      { label: 'Intro / Riff', chords: 'Bm - G - D - A' },
      { label: 'Verso', chords: 'Bm - G - D - A' },
      { label: 'Coro', chords: 'Bm - G - D - A' }
    ],
    lyricsWithChords: `[Verso]
[Bm]Ella durmió [G]al calor de las [D]masas [A]
[Bm]Y yo desperté [G]queriendo soñar[D]la [A]
[Bm]Algún tiempo [G]atrás pensé en escri[D]birle [A]
[Bm]Que nunca sor[G]teé las trampas del [D]amor [A]

[Coro]
[Bm]De aquel a[G]mor de música li[D]gera [A]
[Bm]Nada nos [G]libra, [D]nada más [A]queda`,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z'
  },
  {
    id: 'seed_lamento_boliviano',
    title: 'Lamento Boliviano',
    artist: 'Enanitos Verdes',
    mastery: 'almost',
    readyToSing: true,
    capo: 0,
    key: 'Em',
    strumming: '↓ ↓↑ ↑↓↑',
    notes: 'Practicar la entrada de la voz en el coro sin perder el pulso del rasgueo.',
    sections: [
      { label: 'Verso', chords: 'Em - Bm - Am - Em - B7' },
      { label: 'Coro', chords: 'Em - Bm - Am - Em - B7' }
    ],
    lyricsWithChords: `[Verso]
[Em]Me quieren agitar, me incitan a gritar
[Bm]Soy como una roca, palabras no me tocan
[Am]Adentro hay un volcán que pronto va a estallar
[Em]Yo quiero estar [B7]tranquilo

[Coro]
[Em]Y hoy estoy aquí, [Bm]borracho y loco
[Am]Y mi corazón idiota [Em]siempre brillará [B7]
[Em]Y yo te amaré, [Bm]te amaré por siempre
[Am]Nena, no te peines en la cama
[Em]Que los viajantes se [B7]van a atrasar`,
    createdAt: '2026-11-01T10:05:00.000Z',
    updatedAt: '2026-11-01T10:05:00.000Z'
  },
  {
    id: 'seed_ flaca',
    title: 'Flaca',
    artist: 'Andrés Calamaro',
    mastery: 'learning',
    readyToSing: false,
    capo: 0,
    key: 'G',
    strumming: '↓ ↓↑ ↑↓↑ lento',
    notes: 'Ya me salen bien los acordes, todavía me falta coordinar el cambio de B7 a Em mientras canto.',
    sections: [
      { label: 'Intro / Verso', chords: 'G - B7 - Em - C - G - D - G - D' },
      { label: 'Puente instrumental', chords: 'G - B7 - Em - C - G - D - G' }
    ],
    lyricsWithChords: `[Verso 1]
[G]Flaca, [B7]no me claves [Em]tus puñales [C]por la espalda
[G]Tan profundo, [D]no me duelen, [G]no me hacen [D]mal
[G]Lejos, [B7]en el centro [Em]de la tierra, [C]las raíces
[G]Del amor [D]donde estaban [G]quedarán [D]`,
    createdAt: '2026-11-01T10:10:00.000Z',
    updatedAt: '2026-11-01T10:10:00.000Z'
  }
];

export function loadSongsFromStorage(storage = globalThis.localStorage) {
  if (!storage) return [...DEFAULT_SONGS];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SONGS));
      return [...DEFAULT_SONGS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SONGS];
    const validSongs = [];
    for (const item of parsed) {
      try {
        validSongs.push(validateAndNormalizeSong(item, item.id));
      } catch {
        // Ignore malformed entries cleanly
      }
    }
    return validSongs;
  } catch {
    return [...DEFAULT_SONGS];
  }
}

export function saveSongsToStorage(songs, storage = globalThis.localStorage) {
  if (!storage || !Array.isArray(songs)) return false;
  storage.setItem(STORAGE_KEY, JSON.stringify(songs));
  return true;
}

export function serializeBackup(songs) {
  return JSON.stringify(
    {
      app: 'cancionero-guitarra-pwa',
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: Array.isArray(songs) ? songs : []
    },
    null,
    2
  );
}

export function parseBackupPayload(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('El archivo de respaldo está vacío.');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('El archivo no tiene un formato JSON válido.');
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.songs)
      ? parsed.songs
      : null;

  if (!rawList) {
    throw new Error('No se encontró una lista de canciones en el respaldo.');
  }

  const normalized = [];
  for (const item of rawList) {
    normalized.push(validateAndNormalizeSong(item, item?.id));
  }
  return normalized;
}
