export const MASTERY_LEVELS = {
  learning: {
    id: 'learning',
    label: 'Aprendiendo',
    shortLabel: 'Aprendiendo',
    step: 1,
    description: 'Practicando acordes y cambios'
  },
  almost: {
    id: 'almost',
    label: 'Casi lista',
    shortLabel: 'Casi lista',
    step: 2,
    description: 'Sale fluida, puliendo detalles'
  },
  mastered: {
    id: 'mastered',
    label: 'Dominada',
    shortLabel: 'Dominada',
    step: 3,
    description: 'Me la sé completa de memoria'
  }
};

export const MASTERY_ORDER = ['learning', 'almost', 'mastered'];

const ANGLO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ANGLO_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const LATIN_SHARP = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const LATIN_FLAT = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

const ROOT_TO_INDEX = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
  Do: 0, 'Si#': 0,
  'Do#': 1, Reb: 1,
  Re: 2,
  'Re#': 3, Mib: 3,
  Mi: 4, Fab: 4,
  Fa: 5, 'Mi#': 5,
  'Fa#': 6, Solb: 6,
  Sol: 7,
  'Sol#': 8, Lab: 8,
  La: 9,
  'La#': 10, Sib: 10,
  Si: 11, Dob: 11
};

const CHORD_REGEX = /^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?(m|maj|min|dim|aug|sus|add|[0-9]|[-+()])*(\/(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?)?$/;

export function isValidChordToken(token) {
  if (!token || typeof token !== 'string') return false;
  const cleaned = token.trim();
  return CHORD_REGEX.test(cleaned);
}

function transposeRootNote(root, semitones) {
  const index = ROOT_TO_INDEX[root];
  if (index === undefined) return root;
  const isLatin = /^(Do|Re|Mi|Fa|Sol|La|Si)/.test(root);
  const preferFlats = root.endsWith('b');
  const nextIndex = ((index + semitones) % 12 + 12) % 12;
  if (isLatin) {
    return preferFlats ? LATIN_FLAT[nextIndex] : LATIN_SHARP[nextIndex];
  }
  return preferFlats ? ANGLO_FLAT[nextIndex] : ANGLO_SHARP[nextIndex];
}

export function transposeChord(chord, semitones = 0) {
  if (!chord || typeof chord !== 'string') return '';
  const trimmed = chord.trim();
  if (!semitones || semitones % 12 === 0) return trimmed;

  const match = trimmed.match(/^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?([^/]*?)(\/(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?)?$/);
  if (!match) return trimmed;

  const [, baseRoot, accidental = '', suffix = '', , bassRoot, bassAccidental = ''] = match;
  if (!isValidChordToken(trimmed)) return trimmed;

  const newMainRoot = transposeRootNote(`${baseRoot}${accidental}`, semitones);
  const newBass = bassRoot ? `/${transposeRootNote(`${bassRoot}${bassAccidental}`, semitones)}` : '';
  return `${newMainRoot}${suffix}${newBass}`;
}

export function parseChordTokens(chordsText, semitones = 0) {
  if (!chordsText || typeof chordsText !== 'string') return [];
  return chordsText
    .split(/[\s,\-|•→/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    // Preserve slash chords by splitting carefully first
    && chordsText
      .split(/[\s,|•→]+|\s+-\s+|-/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => (isValidChordToken(token) ? transposeChord(token, semitones) : token));
}

export function transposeTextChords(text, semitones = 0) {
  if (!text || typeof text !== 'string') return '';
  if (!semitones || semitones % 12 === 0) return text;
  return text.replace(
    /\b(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?(?:m|maj|min|dim|aug|sus|add|[0-9])*(?:\/(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?)?(?=\s|$|[,\-|•→\]])/g,
    (match) => (isValidChordToken(match) ? transposeChord(match, semitones) : match)
  );
}

export function isChordOnlyLine(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed || trimmed.includes('[')) return false;
  // Remove measure bars and separators
  const tokens = trimmed
    .split(/[\s|\-•,xX0-9()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => isValidChordToken(token));
}

export function parseLyricsWithChords(lyricsText, semitones = 0) {
  if (!lyricsText || typeof lyricsText !== 'string') return [];
  const rawLines = lyricsText.replace(/\r\n/g, '\n').split('\n');

  return rawLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return { type: 'empty' };
    }

    // Section header like [Coro] or [Verso 1] where bracket content is NOT a chord
    const singleHeaderMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (singleHeaderMatch && !isValidChordToken(singleHeaderMatch[1])) {
      return {
        type: 'section',
        label: singleHeaderMatch[1].trim()
      };
    }

    // Inline bracketed chords like "[Am]De aquel amor [F]de música ligera"
    if (line.includes('[') && line.includes(']')) {
      const segments = [];
      const regex = /\[([^\]]+)\]([^\[]*)/g;
      let firstBracketIdx = line.indexOf('[');
      if (firstBracketIdx > 0) {
        segments.push({
          chord: '',
          text: line.slice(0, firstBracketIdx)
        });
      }
      let match;
      while ((match = regex.exec(line)) !== null) {
        const rawTag = match[1].trim();
        const transposedTag = isValidChordToken(rawTag)
          ? transposeChord(rawTag, semitones)
          : rawTag;
        segments.push({
          chord: transposedTag,
          text: match[2] || ''
        });
      }
      return {
        type: 'inline',
        segments
      };
    }

    // Traditional chord line above lyrics
    if (isChordOnlyLine(line)) {
      return {
        type: 'chord-line',
        content: transposeTextChords(line, semitones)
      };
    }

    return {
      type: 'lyric-line',
      content: line
    };
  });
}

export function extractUniqueChords(song, semitones = 0) {
  const seen = new Set();
  const list = [];

  const addChord = (c) => {
    const clean = transposeChord(c, semitones);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      list.push(clean);
    }
  };

  if (Array.isArray(song?.sections)) {
    for (const sec of song.sections) {
      const tokens = parseChordTokens(sec?.chords || '', 0);
      for (const token of tokens) {
        if (isValidChordToken(token)) addChord(token);
      }
    }
  }

  if (typeof song?.lyricsWithChords === 'string' && song.lyricsWithChords.trim()) {
    const bracketMatches = song.lyricsWithChords.matchAll(/\[([^\]]+)\]/g);
    for (const m of bracketMatches) {
      const candidate = m[1].trim();
      if (isValidChordToken(candidate)) addChord(candidate);
    }
    const lines = song.lyricsWithChords.split('\n');
    for (const line of lines) {
      if (isChordOnlyLine(line)) {
        const tokens = line.trim().split(/[\s|\-•,]+/).filter(Boolean);
        for (const t of tokens) {
          if (isValidChordToken(t)) addChord(t);
        }
      }
    }
  }

  return list;
}

export function validateAndNormalizeSong(raw, existingId = null) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Los datos de la canción no son válidos.');
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) {
    throw new Error('El nombre de la canción es obligatorio.');
  }

  const artist = typeof raw.artist === 'string' ? raw.artist.trim() : '';
  const mastery = MASTERY_LEVELS[raw.mastery] ? raw.mastery : 'learning';
  const readyToSing = Boolean(raw.readyToSing);

  const capoNum = Number.parseInt(raw.capo, 10);
  const capo = Number.isFinite(capoNum) && capoNum >= 0 && capoNum <= 15 ? capoNum : 0;

  const key = typeof raw.key === 'string' ? raw.key.trim() : '';
  const strumming = typeof raw.strumming === 'string' ? raw.strumming.trim() : '';
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
  const lyricsWithChords = typeof raw.lyricsWithChords === 'string' ? raw.lyricsWithChords.replace(/\r\n/g, '\n').trimEnd() : '';

  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = rawSections
    .map((sec) => ({
      label: typeof sec?.label === 'string' && sec.label.trim() ? sec.label.trim() : 'Sección',
      chords: typeof sec?.chords === 'string' ? sec.chords.trim() : ''
    }))
    .filter((sec) => sec.chords.length > 0);

  const now = new Date().toISOString();
  const id = existingId || (typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `song_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  return {
    id,
    title,
    artist,
    mastery,
    readyToSing,
    capo,
    key,
    strumming,
    notes,
    sections,
    lyricsWithChords,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: now
  };
}

export function normalizeSearchText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterSongs(songs, { query = '', mastery = 'all', singStatus = 'all' } = {}) {
  if (!Array.isArray(songs)) return [];
  const normalizedQuery = normalizeSearchText(query);

  return songs.filter((song) => {
    if (mastery !== 'all' && song.mastery !== mastery) {
      return false;
    }
    if (singStatus === 'ready' && !song.readyToSing) {
      return false;
    }
    if (singStatus === 'not-ready' && song.readyToSing) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const chordsText = extractUniqueChords(song).join(' ');
    const sectionsText = (song.sections || []).map((s) => `${s.label} ${s.chords}`).join(' ');
    const haystack = normalizeSearchText(
      `${song.title} ${song.artist} ${song.key || ''} ${chordsText} ${sectionsText} ${song.notes || ''}`
    );
    return haystack.includes(normalizedQuery);
  });
}

export function computeStats(songs) {
  const list = Array.isArray(songs) ? songs : [];
  return {
    total: list.length,
    learning: list.filter((s) => s.mastery === 'learning').length,
    almost: list.filter((s) => s.mastery === 'almost').length,
    mastered: list.filter((s) => s.mastery === 'mastered').length,
    readyToSing: list.filter((s) => Boolean(s.readyToSing)).length,
    notReadyToSing: list.filter((s) => !s.readyToSing).length
  };
}

export function cycleMastery(currentMastery) {
  const idx = MASTERY_ORDER.indexOf(currentMastery);
  if (idx === -1) return 'learning';
  return MASTERY_ORDER[(idx + 1) % MASTERY_ORDER.length];
}
