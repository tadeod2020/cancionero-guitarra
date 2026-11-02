import { validateAndNormalizeSong } from './domain.js';

export const STORAGE_KEY = 'cancionero_guitarra_v1';

export const DEFAULT_SONGS = [];

const LEGACY_SEED_IDS = new Set([
  'seed_musica_ligera',
  'seed_lamento_boliviano',
  'seed_ flaca',
  'seed_flaca'
]);

export function loadSongsFromStorage(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validSongs = [];
    let removedLegacySeed = false;
    for (const item of parsed) {
      if (item && typeof item.id === 'string' && (LEGACY_SEED_IDS.has(item.id) || item.id.startsWith('seed_'))) {
        removedLegacySeed = true;
        continue;
      }
      try {
        validSongs.push(validateAndNormalizeSong(item, item.id));
      } catch {
        // Ignore malformed entries cleanly
      }
    }
    if (removedLegacySeed) {
      storage.setItem(STORAGE_KEY, JSON.stringify(validSongs));
    }
    return validSongs;
  } catch {
    return [];
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
