import {
  MASTERY_LEVELS,
  transposeChord,
  parseChordTokens,
  parseLyricsWithChords,
  extractUniqueChords,
  validateAndNormalizeSong,
  filterSongs,
  computeStats,
  cycleMastery
} from './domain.js';

import {
  loadSongsFromStorage,
  saveSongsToStorage,
  serializeBackup,
  parseBackupPayload
} from './storage.js';

const MASTERY_ICONS = {
  learning: '🌱',
  almost: '🔥',
  mastered: '⭐'
};

const state = {
  songs: [],
  filters: {
    query: '',
    mastery: 'all',
    singStatus: 'all'
  },
  activeSongId: null,
  transposeSemitones: 0,
  lastFocusedChordInput: null,
  wakeLockSentinel: null
};

// Elementos del DOM
const els = {
  repertoireView: document.getElementById('repertoire-view'),
  detailView: document.getElementById('detail-view'),
  songsList: document.getElementById('songs-list'),
  emptyState: document.getElementById('empty-state'),
  emptyStateTitle: document.getElementById('empty-state-title'),
  emptyStateDesc: document.getElementById('empty-state-desc'),
  emptyActionBtn: document.getElementById('empty-action-btn'),

  statTotal: document.getElementById('stat-total'),
  statMastered: document.getElementById('stat-mastered'),
  statSing: document.getElementById('stat-sing'),

  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  masteryFilterBtns: document.querySelectorAll('[data-filter-mastery]'),
  singFilterBtns: document.querySelectorAll('[data-filter-sing]'),

  newSongTopBtn: document.getElementById('new-song-top-btn'),
  openBackupBtn: document.getElementById('open-backup-btn'),

  // Vista detalle
  backToListBtn: document.getElementById('back-to-list-btn'),
  editCurrentSongBtn: document.getElementById('edit-current-song-btn'),
  deleteCurrentSongBtn: document.getElementById('delete-current-song-btn'),
  detailSongTitle: document.getElementById('detail-song-title'),
  detailSongArtist: document.getElementById('detail-song-artist'),
  detailMasteryBtns: document.querySelectorAll('[data-set-mastery]'),
  detailToggleSingBtn: document.getElementById('detail-toggle-sing-btn'),
  detailSingIcon: document.getElementById('detail-sing-icon'),
  detailSingText: document.getElementById('detail-sing-text'),
  detailMetaBadges: document.getElementById('detail-meta-badges'),
  transposeDownBtn: document.getElementById('transpose-down-btn'),
  transposeUpBtn: document.getElementById('transpose-up-btn'),
  transposeResetBtn: document.getElementById('transpose-reset-btn'),
  transposeValue: document.getElementById('transpose-value'),
  detailAllChordsSection: document.getElementById('detail-all-chords-section'),
  detailAllChords: document.getElementById('detail-all-chords'),
  detailSectionsCard: document.getElementById('detail-sections-card'),
  detailSectionsList: document.getElementById('detail-sections-list'),
  detailLyricsCard: document.getElementById('detail-lyrics-card'),
  detailLyricsContent: document.getElementById('detail-lyrics-content'),
  detailNotesCard: document.getElementById('detail-notes-card'),
  detailNotesContent: document.getElementById('detail-notes-content'),

  // Dialog Crear/Editar
  songDialog: document.getElementById('song-dialog'),
  songDialogTitle: document.getElementById('song-dialog-title'),
  songForm: document.getElementById('song-form'),
  closeSongDialogBtn: document.getElementById('close-song-dialog-btn'),
  cancelSongDialogBtn: document.getElementById('cancel-song-dialog-btn'),
  songIdInput: document.getElementById('song-id-input'),
  songTitleInput: document.getElementById('song-title-input'),
  songTitleError: document.getElementById('song-title-error'),
  songArtistInput: document.getElementById('song-artist-input'),
  songKeyInput: document.getElementById('song-key-input'),
  songMasterySelect: document.getElementById('song-mastery-select'),
  songSingSelect: document.getElementById('song-sing-select'),
  songCapoInput: document.getElementById('song-capo-input'),
  songStrummingInput: document.getElementById('song-strumming-input'),
  sectionsEditorList: document.getElementById('sections-editor-list'),
  addSectionRowBtn: document.getElementById('add-section-row-btn'),
  songLyricsInput: document.getElementById('song-lyrics-input'),
  songNotesInput: document.getElementById('song-notes-input'),
  quickChordBtns: document.querySelectorAll('.chord-key-btn'),

  // Dialog Respaldo
  backupDialog: document.getElementById('backup-dialog'),
  closeBackupDialogBtn: document.getElementById('close-backup-dialog-btn'),
  exportBackupBtn: document.getElementById('export-backup-btn'),
  importBackupInput: document.getElementById('import-backup-input'),

  // Dialog Confirmar Eliminación
  confirmDeleteDialog: document.getElementById('confirm-delete-dialog'),
  confirmDeleteMessage: document.getElementById('confirm-delete-message'),

  toastRegion: document.getElementById('toast-region')
};

function showToast(message) {
  if (!els.toastRegion) return;
  const item = document.createElement('div');
  item.className = 'toast-message';
  item.textContent = message;
  els.toastRegion.replaceChildren(item);
  setTimeout(() => {
    if (els.toastRegion.contains(item)) {
      els.toastRegion.removeChild(item);
    }
  }, 2600);
}

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      state.wakeLockSentinel = await navigator.wakeLock.request('screen');
    } catch {
      // Ignorar silenciosamente si el navegador o batería baja lo rechaza
    }
  }
}

async function releaseWakeLock() {
  if (state.wakeLockSentinel) {
    try {
      await state.wakeLockSentinel.release();
    } catch {
      // Ignorar
    }
    state.wakeLockSentinel = null;
  }
}

function persistSongs() {
  saveSongsToStorage(state.songs);
  renderStats();
}

function renderStats() {
  const stats = computeStats(state.songs);
  els.statTotal.textContent = String(stats.total);
  els.statMastered.textContent = String(stats.mastered);
  els.statSing.textContent = String(stats.readyToSing);
}

function createChordPill(chordText, large = false) {
  const span = document.createElement('span');
  span.className = large ? 'chord-pill chord-pill-large' : 'chord-pill';
  span.textContent = chordText;
  return span;
}

function renderSongsList() {
  renderStats();
  const filtered = filterSongs(state.songs, state.filters);
  els.songsList.replaceChildren();

  const hasActiveFilters =
    state.filters.query.trim() !== '' ||
    state.filters.mastery !== 'all' ||
    state.filters.singStatus !== 'all';

  if (filtered.length === 0) {
    els.emptyState.hidden = false;
    if (state.songs.length === 0) {
      els.emptyStateTitle.textContent = 'Aún no tienes canciones guardadas';
      els.emptyStateDesc.textContent = 'Agrega las canciones que estás practicando o que ya te sabes en la guitarra.';
      els.emptyActionBtn.textContent = 'Agregar primera canción';
      els.emptyActionBtn.dataset.mode = 'create';
    } else if (hasActiveFilters) {
      els.emptyStateTitle.textContent = 'Sin resultados para este filtro';
      els.emptyStateDesc.textContent = 'Prueba buscando otro nombre o mostrando todas tus canciones.';
      els.emptyActionBtn.textContent = 'Limpiar filtros';
      els.emptyActionBtn.dataset.mode = 'reset-filters';
    }
    return;
  }

  els.emptyState.hidden = true;

  for (const song of filtered) {
    const card = document.createElement('article');
    card.className = 'song-card';
    card.setAttribute('role', 'listitem');

    // Cabecera de la tarjeta
    const header = document.createElement('div');
    header.className = 'song-card-header';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'song-card-open-btn';
    openBtn.addEventListener('click', () => openSongDetail(song.id));

    const titleEl = document.createElement('h2');
    titleEl.className = 'song-card-title';
    titleEl.textContent = song.title;
    openBtn.appendChild(titleEl);

    if (song.artist) {
      const artistEl = document.createElement('p');
      artistEl.className = 'song-card-artist';
      artistEl.textContent = song.artist;
      openBtn.appendChild(artistEl);
    }

    header.appendChild(openBtn);
    card.appendChild(header);

    // Vista previa de acordes
    const uniqueChords = extractUniqueChords(song);
    if (uniqueChords.length > 0) {
      const chordsRow = document.createElement('div');
      chordsRow.className = 'chord-pills-wrap';
      chordsRow.setAttribute('aria-label', `Acordes: ${uniqueChords.join(', ')}`);
      for (const chord of uniqueChords.slice(0, 8)) {
        chordsRow.appendChild(createChordPill(chord));
      }
      if (uniqueChords.length > 8) {
        const more = document.createElement('span');
        more.className = 'subtitle';
        more.textContent = `+${uniqueChords.length - 8}`;
        chordsRow.appendChild(more);
      }
      card.appendChild(chordsRow);
    }

    // Pie de tarjeta con nivel de dominio y estado para cantar (interactivos con 1 toque)
    const footer = document.createElement('div');
    footer.className = 'song-card-footer';

    const badgesWrap = document.createElement('div');
    badgesWrap.className = 'badge-group';

    const masteryInfo = MASTERY_LEVELS[song.mastery] || MASTERY_LEVELS.learning;
    const masteryBtn = document.createElement('button');
    masteryBtn.type = 'button';
    masteryBtn.className = 'status-badge';
    masteryBtn.dataset.mastery = masteryInfo.id;
    masteryBtn.setAttribute('aria-label', `Dominio: ${masteryInfo.label}. Toca para cambiar.`);
    masteryBtn.textContent = `${MASTERY_ICONS[masteryInfo.id]} ${masteryInfo.label}`;
    masteryBtn.addEventListener('click', () => {
      song.mastery = cycleMastery(song.mastery);
      song.updatedAt = new Date().toISOString();
      persistSongs();
      renderSongsList();
      const updatedLabel = MASTERY_LEVELS[song.mastery].label;
      showToast(`«${song.title}»: ${updatedLabel}`);
    });

    const singBtn = document.createElement('button');
    singBtn.type = 'button';
    singBtn.className = `status-badge ${song.readyToSing ? 'sing-badge-ready' : 'sing-badge-wait'}`;
    singBtn.setAttribute('aria-pressed', String(Boolean(song.readyToSing)));
    singBtn.setAttribute(
      'aria-label',
      song.readyToSing
        ? 'Ya está para cantar. Toca para marcar como todavía no.'
        : 'Todavía no está para cantar. Toca para marcar como lista para cantar.'
    );
    singBtn.textContent = song.readyToSing ? '🎤 Lista para cantar' : '⏳ Todavía no';
    singBtn.addEventListener('click', () => {
      song.readyToSing = !song.readyToSing;
      song.updatedAt = new Date().toISOString();
      persistSongs();
      renderSongsList();
      showToast(
        song.readyToSing
          ? `🎤 «${song.title}» lista para cantar`
          : `⏳ «${song.title}» marcada como todavía no`
      );
    });

    badgesWrap.append(masteryBtn, singBtn);
    footer.appendChild(badgesWrap);
    card.appendChild(footer);

    els.songsList.appendChild(card);
  }
}

function getActiveSong() {
  return state.songs.find((s) => s.id === state.activeSongId) || null;
}

function openSongDetail(songId) {
  const song = state.songs.find((s) => s.id === songId);
  if (!song) return;

  state.activeSongId = song.id;
  state.transposeSemitones = 0;

  els.repertoireView.hidden = true;
  els.detailView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });

  renderSongDetail();
  requestWakeLock();
}

function closeSongDetail() {
  state.activeSongId = null;
  state.transposeSemitones = 0;
  els.detailView.hidden = true;
  els.repertoireView.hidden = false;
  renderSongsList();
  releaseWakeLock();
}

function renderSongDetail() {
  const song = getActiveSong();
  if (!song) return;

  const semitones = state.transposeSemitones;
  els.detailSongTitle.textContent = song.title;
  els.detailSongArtist.textContent = song.artist || 'Sin artista especificado';

  // Botones segmentados de "¿Cuánto me la sé?"
  els.detailMasteryBtns.forEach((btn) => {
    const isSelected = btn.dataset.setMastery === song.mastery;
    btn.classList.toggle('is-selected', isSelected);
    btn.setAttribute('aria-pressed', String(isSelected));
  });

  // Switch "¿Lista para cantarla?"
  els.detailToggleSingBtn.setAttribute('aria-pressed', String(Boolean(song.readyToSing)));
  els.detailSingIcon.textContent = song.readyToSing ? '🎤' : '⏳';
  els.detailSingText.textContent = song.readyToSing ? '¡Ya está para cantar!' : 'Todavía no';

  // Metadatos (Tono, Cejilla/Capo, Rasgueo)
  els.detailMetaBadges.replaceChildren();
  if (song.key) {
    const displayedKey = transposeChord(song.key, semitones);
    const badge = document.createElement('span');
    badge.className = 'meta-tag';
    badge.innerHTML = `Tono: <strong></strong>`;
    badge.querySelector('strong').textContent = displayedKey;
    els.detailMetaBadges.appendChild(badge);
  }
  if (song.capo > 0) {
    const badge = document.createElement('span');
    badge.className = 'meta-tag';
    badge.innerHTML = `Capo: <strong>Traste ${song.capo}</strong>`;
    els.detailMetaBadges.appendChild(badge);
  }
  if (song.strumming) {
    const badge = document.createElement('span');
    badge.className = 'meta-tag';
    badge.innerHTML = `Rasgueo: <strong></strong>`;
    badge.querySelector('strong').textContent = song.strumming;
    els.detailMetaBadges.appendChild(badge);
  }

  // Estado del transpositor
  if (semitones === 0) {
    els.transposeValue.textContent = 'Original';
    els.transposeResetBtn.hidden = true;
  } else {
    els.transposeValue.textContent = `${semitones > 0 ? '+' : ''}${semitones} st`;
    els.transposeResetBtn.hidden = false;
  }

  // Todos los acordes únicos de la canción
  const uniqueChords = extractUniqueChords(song, semitones);
  els.detailAllChords.replaceChildren();
  if (uniqueChords.length > 0) {
    els.detailAllChordsSection.hidden = false;
    for (const c of uniqueChords) {
      els.detailAllChords.appendChild(createChordPill(c, true));
    }
  } else {
    els.detailAllChordsSection.hidden = true;
  }

  // Secciones de acordes
  els.detailSectionsList.replaceChildren();
  if (Array.isArray(song.sections) && song.sections.length > 0) {
    els.detailSectionsCard.hidden = false;
    for (const sec of song.sections) {
      const row = document.createElement('div');
      row.className = 'section-progression-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'section-progression-label';
      labelEl.textContent = sec.label;

      const pillsWrap = document.createElement('div');
      pillsWrap.className = 'chord-pills-wrap';
      const tokens = parseChordTokens(sec.chords, semitones);
      for (const token of tokens) {
        pillsWrap.appendChild(createChordPill(token, true));
      }

      row.append(labelEl, pillsWrap);
      els.detailSectionsList.appendChild(row);
    }
  } else {
    els.detailSectionsCard.hidden = true;
  }

  // Letra y cifrado
  els.detailLyricsContent.replaceChildren();
  if (song.lyricsWithChords && song.lyricsWithChords.trim()) {
    els.detailLyricsCard.hidden = false;
    const parsedLines = parseLyricsWithChords(song.lyricsWithChords, semitones);
    for (const line of parsedLines) {
      if (line.type === 'empty') {
        const spacer = document.createElement('div');
        spacer.className = 'lyrics-empty-line';
        els.detailLyricsContent.appendChild(spacer);
      } else if (line.type === 'section') {
        const tag = document.createElement('div');
        tag.className = 'lyrics-section-tag';
        tag.textContent = line.label;
        els.detailLyricsContent.appendChild(tag);
      } else if (line.type === 'chord-line') {
        const chordLine = document.createElement('div');
        chordLine.className = 'lyrics-chord-only-line';
        chordLine.textContent = line.content;
        els.detailLyricsContent.appendChild(chordLine);
      } else if (line.type === 'lyric-line') {
        const textLine = document.createElement('div');
        textLine.className = 'lyrics-text-line';
        textLine.textContent = line.content;
        els.detailLyricsContent.appendChild(textLine);
      } else if (line.type === 'inline') {
        const inlineRow = document.createElement('div');
        inlineRow.className = 'lyrics-inline-row';
        for (const seg of line.segments) {
          const pair = document.createElement('span');
          pair.className = 'chord-lyric-pair';

          const chordEl = document.createElement('span');
          chordEl.className = 'pair-chord';
          chordEl.textContent = seg.chord || '\u00A0';

          const textEl = document.createElement('span');
          textEl.className = 'pair-lyric';
          textEl.textContent = seg.text || '\u00A0';

          pair.append(chordEl, textEl);
          inlineRow.appendChild(pair);
        }
        els.detailLyricsContent.appendChild(inlineRow);
      }
    }
  } else {
    els.detailLyricsCard.hidden = true;
  }

  // Notas adicionales
  if (song.notes && song.notes.trim()) {
    els.detailNotesCard.hidden = false;
    els.detailNotesContent.textContent = song.notes;
  } else {
    els.detailNotesCard.hidden = true;
  }
}

// Editor de filas de secciones en el formulario
function addSectionRow(label = 'Verso', chords = '') {
  const row = document.createElement('div');
  row.className = 'section-editor-row';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'section-label-input';
  labelInput.placeholder = 'Sección (ej. Coro)';
  labelInput.setAttribute('aria-label', 'Nombre de la sección');
  labelInput.value = label;

  const chordsInput = document.createElement('input');
  chordsInput.type = 'text';
  chordsInput.className = 'section-chords-input';
  chordsInput.placeholder = 'Acordes (ej. Am - F - C - G)';
  chordsInput.setAttribute('aria-label', 'Acordes de la sección');
  chordsInput.value = chords;

  chordsInput.addEventListener('focus', () => {
    state.lastFocusedChordInput = chordsInput;
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'icon-btn';
  removeBtn.setAttribute('aria-label', 'Quitar sección');
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  row.append(labelInput, chordsInput, removeBtn);
  els.sectionsEditorList.appendChild(row);
  return chordsInput;
}

function openSongFormModal(songToEdit = null) {
  els.songTitleError.hidden = true;
  els.sectionsEditorList.replaceChildren();

  if (songToEdit) {
    els.songDialogTitle.textContent = 'Editar canción';
    els.songIdInput.value = songToEdit.id;
    els.songTitleInput.value = songToEdit.title;
    els.songArtistInput.value = songToEdit.artist || '';
    els.songKeyInput.value = songToEdit.key || '';
    els.songMasterySelect.value = songToEdit.mastery || 'learning';
    els.songSingSelect.value = String(Boolean(songToEdit.readyToSing));
    els.songCapoInput.value = String(songToEdit.capo || 0);
    els.songStrummingInput.value = songToEdit.strumming || '';
    els.songLyricsInput.value = songToEdit.lyricsWithChords || '';
    els.songNotesInput.value = songToEdit.notes || '';

    if (Array.isArray(songToEdit.sections) && songToEdit.sections.length > 0) {
      for (const sec of songToEdit.sections) {
        addSectionRow(sec.label, sec.chords);
      }
    } else {
      addSectionRow('Verso', '');
    }
  } else {
    els.songDialogTitle.textContent = 'Nueva canción';
    els.songForm.reset();
    els.songIdInput.value = '';
    els.songMasterySelect.value = 'learning';
    els.songSingSelect.value = 'false';
    els.songCapoInput.value = '0';
    addSectionRow('Verso', '');
    addSectionRow('Coro', '');
  }

  const firstChordField = els.sectionsEditorList.querySelector('.section-chords-input');
  state.lastFocusedChordInput = firstChordField || els.songLyricsInput;

  els.songDialog.showModal();
  els.songTitleInput.focus();
}

function handleSaveSongForm(event) {
  event.preventDefault();
  const rawTitle = els.songTitleInput.value.trim();
  if (!rawTitle) {
    els.songTitleError.hidden = false;
    els.songTitleInput.focus();
    return;
  }
  els.songTitleError.hidden = true;

  const sectionRows = els.sectionsEditorList.querySelectorAll('.section-editor-row');
  const sections = [];
  sectionRows.forEach((row) => {
    const label = row.querySelector('.section-label-input')?.value.trim() || 'Sección';
    const chords = row.querySelector('.section-chords-input')?.value.trim() || '';
    if (chords) {
      sections.push({ label, chords });
    }
  });

  const existingId = els.songIdInput.value.trim() || null;
  const existingSong = existingId ? state.songs.find((s) => s.id === existingId) : null;

  const normalized = validateAndNormalizeSong(
    {
      title: rawTitle,
      artist: els.songArtistInput.value,
      key: els.songKeyInput.value,
      mastery: els.songMasterySelect.value,
      readyToSing: els.songSingSelect.value === 'true',
      capo: els.songCapoInput.value,
      strumming: els.songStrummingInput.value,
      sections,
      lyricsWithChords: els.songLyricsInput.value,
      notes: els.songNotesInput.value,
      createdAt: existingSong?.createdAt
    },
    existingId
  );

  if (existingSong) {
    const idx = state.songs.findIndex((s) => s.id === existingId);
    state.songs[idx] = normalized;
    showToast('Canción actualizada');
  } else {
    state.songs.unshift(normalized);
    showToast('Canción guardada en tu repertorio');
  }

  persistSongs();
  els.songDialog.close();

  if (state.activeSongId === normalized.id) {
    renderSongDetail();
  } else {
    openSongDetail(normalized.id);
  }
}

function setupSafariDialogLightDismiss() {
  // Fallback oficial de modern-web-guidance para Safari donde closedBy no existe aún
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }
}

function bindEvents() {
  // Búsqueda
  els.searchInput.addEventListener('input', () => {
    state.filters.query = els.searchInput.value;
    els.clearSearchBtn.hidden = state.filters.query.length === 0;
    renderSongsList();
  });

  els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    state.filters.query = '';
    els.clearSearchBtn.hidden = true;
    els.searchInput.focus();
    renderSongsList();
  });

  // Filtros de cuánto me la sé
  els.masteryFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filters.mastery = btn.dataset.filterMastery;
      els.masteryFilterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderSongsList();
    });
  });

  // Filtros de estado para cantar
  els.singFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filters.singStatus = btn.dataset.filterSing;
      els.singFilterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderSongsList();
    });
  });

  // Botón estado vacío
  els.emptyActionBtn.addEventListener('click', () => {
    if (els.emptyActionBtn.dataset.mode === 'reset-filters') {
      state.filters = { query: '', mastery: 'all', singStatus: 'all' };
      els.searchInput.value = '';
      els.clearSearchBtn.hidden = true;
      els.masteryFilterBtns.forEach((b) => {
        const active = b.dataset.filterMastery === 'all';
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      els.singFilterBtns.forEach((b) => {
        const active = b.dataset.filterSing === 'all';
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderSongsList();
    } else {
      openSongFormModal(null);
    }
  });

  // Abrir formulario nueva canción
  els.newSongTopBtn.addEventListener('click', () => openSongFormModal(null));

  // Vista Detalle
  els.backToListBtn.addEventListener('click', closeSongDetail);

  els.editCurrentSongBtn.addEventListener('click', () => {
    const song = getActiveSong();
    if (song) openSongFormModal(song);
  });

  els.deleteCurrentSongBtn.addEventListener('click', () => {
    const song = getActiveSong();
    if (!song) return;
    els.confirmDeleteMessage.textContent = `¿Seguro que quieres eliminar «${song.title}» de tu repertorio?`;
    els.confirmDeleteDialog.returnValue = '';
    els.confirmDeleteDialog.showModal();
  });

  els.confirmDeleteDialog.addEventListener('close', () => {
    const choice = els.confirmDeleteDialog.returnValue;
    els.confirmDeleteDialog.returnValue = '';
    if (choice === 'delete' && state.activeSongId) {
      const deletedTitle = getActiveSong()?.title || 'Canción';
      state.songs = state.songs.filter((s) => s.id !== state.activeSongId);
      persistSongs();
      closeSongDetail();
      showToast(`«${deletedTitle}» eliminada`);
    }
  });

  // Cambiar cuánto me la sé dentro del detalle
  els.detailMasteryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const song = getActiveSong();
      if (!song) return;
      song.mastery = btn.dataset.setMastery;
      song.updatedAt = new Date().toISOString();
      persistSongs();
      renderSongDetail();
      showToast(`Dominio: ${MASTERY_LEVELS[song.mastery].label}`);
    });
  });

  // Cambiar si ya está para cantarla dentro del detalle
  els.detailToggleSingBtn.addEventListener('click', () => {
    const song = getActiveSong();
    if (!song) return;
    song.readyToSing = !song.readyToSing;
    song.updatedAt = new Date().toISOString();
    persistSongs();
    renderSongDetail();
    showToast(song.readyToSing ? '🎤 ¡Marcada como lista para cantar!' : '⏳ Marcada como todavía no');
  });

  // Transponer acordes
  els.transposeDownBtn.addEventListener('click', () => {
    state.transposeSemitones -= 1;
    renderSongDetail();
  });

  els.transposeUpBtn.addEventListener('click', () => {
    state.transposeSemitones += 1;
    renderSongDetail();
  });

  els.transposeResetBtn.addEventListener('click', () => {
    state.transposeSemitones = 0;
    renderSongDetail();
  });

  // Eventos del formulario de canción
  els.closeSongDialogBtn.addEventListener('click', () => els.songDialog.close());
  els.cancelSongDialogBtn.addEventListener('click', () => els.songDialog.close());
  els.songForm.addEventListener('submit', handleSaveSongForm);

  els.addSectionRowBtn.addEventListener('click', () => {
    const input = addSectionRow('Sección', '');
    input.focus();
  });

  // Recordar cuál campo de acordes/letra/rasgueo tiene el foco para el teclado rápido
  [els.songKeyInput, els.songStrummingInput, els.songLyricsInput].forEach((inputEl) => {
    inputEl.addEventListener('focus', () => {
      state.lastFocusedChordInput = inputEl;
    });
  });

  els.quickChordBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target =
        state.lastFocusedChordInput ||
        els.sectionsEditorList.querySelector('.section-chords-input') ||
        els.songLyricsInput;
      if (!target) return;

      const textToInsert = btn.dataset.insert || '';
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const before = target.value.slice(0, start);
      const after = target.value.slice(end);
      target.value = `${before}${textToInsert}${after}`;
      const nextCursor = start + textToInsert.length;
      target.focus();
      target.setSelectionRange(nextCursor, nextCursor);
    });
  });

  // Respaldo e instalación en iPhone
  els.openBackupBtn.addEventListener('click', () => {
    els.backupDialog.showModal();
  });

  els.closeBackupDialogBtn.addEventListener('click', () => {
    els.backupDialog.close();
  });

  els.exportBackupBtn.addEventListener('click', () => {
    const json = serializeBackup(state.songs);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `cancionero-guitarra-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Respaldo descargado');
  });

  els.importBackupInput.addEventListener('change', async () => {
    const file = els.importBackupInput.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const importedSongs = parseBackupPayload(content);
      state.songs = importedSongs;
      persistSongs();
      renderSongsList();
      els.backupDialog.close();
      showToast(`Se importaron ${importedSongs.length} canciones`);
    } catch (err) {
      showToast(err.message || 'No se pudo importar el archivo');
    } finally {
      els.importBackupInput.value = '';
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // En entorno file:// o sin HTTPS local puede omitirse sin bloquear la app
      });
    });
  }
}

function initApp() {
  state.songs = loadSongsFromStorage();
  setupSafariDialogLightDismiss();
  bindEvents();
  renderSongsList();
  registerServiceWorker();
}

initApp();
