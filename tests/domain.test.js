import test from 'node:test';
import assert from 'node:assert/strict';
import {
  transposeChord,
  parseChordTokens,
  parseLyricsWithChords,
  extractUniqueChords,
  validateAndNormalizeSong,
  filterSongs,
  computeStats,
  cycleMastery
} from '../src/domain.js';
import {
  serializeBackup,
  parseBackupPayload,
  loadSongsFromStorage,
  saveSongsToStorage
} from '../src/storage.js';

test('transposeChord transposes Anglo, Latin, and slash chords accurately', () => {
  assert.equal(transposeChord('Am', 2), 'Bm');
  assert.equal(transposeChord('F#m7', -1), 'Fm7');
  assert.equal(transposeChord('G/B', 2), 'A/C#');
  assert.equal(transposeChord('Bb', 2), 'C');
  assert.equal(transposeChord('Lam', 2), 'Sim');
  assert.equal(transposeChord('Do', 7), 'Sol');
});

test('parseChordTokens splits progression strings and applies transposition', () => {
  const tokens = parseChordTokens('Bm - G - D - A', 2);
  assert.deepEqual(tokens, ['C#m', 'A', 'E', 'B']);
});

test('parseLyricsWithChords handles section headers, inline bracket chords, and chord-only lines', () => {
  const sample = `[Coro]
[Am]De aquel a[F]mor
C           G
nada nos libra`;

  const parsed = parseLyricsWithChords(sample, 2);
  assert.equal(parsed[0].type, 'section');
  assert.equal(parsed[0].label, 'Coro');

  assert.equal(parsed[1].type, 'inline');
  assert.deepEqual(parsed[1].segments, [
    { chord: 'Bm', text: 'De aquel a' },
    { chord: 'G', text: 'mor' }
  ]);

  assert.equal(parsed[2].type, 'chord-line');
  assert.match(parsed[2].content, /D\s+A/);

  assert.equal(parsed[3].type, 'lyric-line');
  assert.equal(parsed[3].content, 'nada nos libra');
});

test('validateAndNormalizeSong enforces required title and normalizes fields', () => {
  assert.throws(() => validateAndNormalizeSong({ title: '   ' }), /obligatorio/);

  const song = validateAndNormalizeSong({
    title: '  Wonderwall ',
    artist: ' Oasis ',
    mastery: 'almost',
    readyToSing: 1,
    capo: '2',
    sections: [
      { label: 'Verso', chords: 'Em7 - G - Dsus4 - A7sus4' },
      { label: 'Vacía', chords: '   ' }
    ]
  });

  assert.equal(song.title, 'Wonderwall');
  assert.equal(song.artist, 'Oasis');
  assert.equal(song.mastery, 'almost');
  assert.equal(song.readyToSing, true);
  assert.equal(song.capo, 2);
  assert.equal(song.sections.length, 1);
  assert.deepEqual(extractUniqueChords(song), ['Em7', 'G', 'Dsus4', 'A7sus4']);
});

test('filterSongs and computeStats filter by query (accent-insensitive), mastery, and sing status', () => {
  const songs = [
    validateAndNormalizeSong({
      id: '1',
      title: 'De Música Ligera',
      artist: 'Soda Stereo',
      mastery: 'mastered',
      readyToSing: true,
      sections: [{ label: 'Intro', chords: 'Bm - G - D - A' }]
    }),
    validateAndNormalizeSong({
      id: '2',
      title: 'Flaca',
      artist: 'Andrés Calamaro',
      mastery: 'learning',
      readyToSing: false,
      sections: [{ label: 'Verso', chords: 'G - B7 - Em - C' }]
    })
  ];

  assert.equal(filterSongs(songs, { query: 'musica' }).length, 1);
  assert.equal(filterSongs(songs, { query: 'B7' }).length, 1);
  assert.equal(filterSongs(songs, { mastery: 'learning' }).length, 1);
  assert.equal(filterSongs(songs, { singStatus: 'ready' }).length, 1);
  assert.equal(filterSongs(songs, { singStatus: 'not-ready' }).length, 1);

  const stats = computeStats(songs);
  assert.equal(stats.total, 2);
  assert.equal(stats.mastered, 1);
  assert.equal(stats.learning, 1);
  assert.equal(stats.readyToSing, 1);
  assert.equal(stats.notReadyToSing, 1);
  assert.equal(cycleMastery('learning'), 'almost');
  assert.equal(cycleMastery('almost'), 'mastered');
  assert.equal(cycleMastery('mastered'), 'learning');
});

test('storage starts empty by default, cleans legacy seeds, and roundtrips backups', () => {
  const mem = new Map();
  const mockStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v)
  };

  const initial = loadSongsFromStorage(mockStorage);
  assert.equal(initial.length, 0);

  const sampleSong = validateAndNormalizeSong({
    id: 'custom_1',
    title: 'Mi Canción',
    artist: 'Yo',
    mastery: 'mastered',
    readyToSing: true,
    sections: [{ label: 'Intro', chords: 'Am - G - F - E' }]
  });

  // Verify legacy seed songs are stripped automatically while keeping user songs
  saveSongsToStorage(
    [
      { id: 'seed_musica_ligera', title: 'De Música Ligera' },
      sampleSong
    ],
    mockStorage
  );
  const cleaned = loadSongsFromStorage(mockStorage);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].title, 'Mi Canción');

  const backupJson = serializeBackup(cleaned);
  const restored = parseBackupPayload(backupJson);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].title, 'Mi Canción');
});

test('PWA assets, iOS Safari tags, and modern-web-guidance dialog rules are present', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.resolve(import.meta.dirname, '..');

  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.match(html, /manifest\.webmanifest/);

  const css = await fs.readFile(path.join(root, 'styles.css'), 'utf8');
  assert.match(css, /dialog:modal\s*\{[\s\S]*?overscroll-behavior:\s*contain/);
  assert.match(css, /dialog::backdrop\s*\{[\s\S]*?overflow:\s*hidden[\s\S]*?overscroll-behavior:\s*contain/);

  const requiredFiles = [
    'index.html',
    'styles.css',
    'manifest.webmanifest',
    'sw.js',
    'src/app.js',
    'src/domain.js',
    'src/storage.js',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png'
  ];

  for (const rel of requiredFiles) {
    const stat = await fs.stat(path.join(root, rel));
    assert.ok(stat.size > 0, `Expected ${rel} to exist and be non-empty`);
  }
});
