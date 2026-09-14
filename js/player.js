/* Risyad Music — player.js
 * Satu elemen audio saja (#audioPlayer). Tidak membuat Audio object baru.
 * Hemat kuota: hanya muat audio yang diputar, tidak preload semua lagu/queue.
 * Terintegrasi dengan QueueModule (antrean). Prioritas next: queue -> library/shuffle.
 */
const Player = (function () {
  let audio = null;
  let library = [];
  let currentId = null;
  let isPlaying = false;
  let shuffle = false;
  let repeatMode = 'off'; // off | all | one
  const listeners = { track: [], state: [], progress: [], queue: [] };

  function init(audioEl, songList) {
    audio = audioEl;
    library = Array.isArray(songList) ? songList.slice() : [];
    shuffle = getShuffleState();
    repeatMode = getRepeatMode();
    const vol = getVolume();
    audio.volume = vol;
    // Hemat kuota: metadata saja, bukan auto
    audio.preload = 'metadata';

    audio.addEventListener('loadedmetadata', () => emit('progress'));
    audio.addEventListener('timeupdate', () => emit('progress'));
    audio.addEventListener('play', () => { isPlaying = true; emit('state'); });
    audio.addEventListener('pause', () => { isPlaying = false; emit('state'); });
    audio.addEventListener('volumechange', () => { emit('state'); });
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', () => {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('File audio tidak ditemukan. Ganti dengan MP3 asli.');
      isPlaying = false;
      emit('state');
    });
    // Queue listener -> emit queue ke UI
    if (typeof QueueModule !== 'undefined' && QueueModule.on) {
      QueueModule.on(() => emit('queue'));
    }
    emit('track');
    emit('state');
    emit('queue');
  }

  function on(evt, fn) {
    if (listeners[evt]) listeners[evt].push(fn);
  }

  function emit(evt) {
    const fns = listeners[evt] || [];
    const snapshot = getState();
    fns.forEach((fn) => { try { fn(snapshot); } catch (e) {} });
  }

  function resolveSong(id) {
    if(typeof songMap!=='undefined' && songMap.has(String(id))) return songMap.get(String(id));
    const all = typeof songs !== 'undefined' ? songs : library;
    return all.find((s) => String(s.id) === String(id)) || null;
  }

  function current() {
    return currentId === null ? null : resolveSong(currentId);
  }

  function getSongSrc(song) {
    if (!song) return '';
    // dukung struktur audio: {saver, normal, high} — pilih satu sesuai setting
    if (song.audio && typeof song.audio === 'object') {
      const q = typeof getAudioQuality === 'function' ? getAudioQuality() : 'normal';
      if (q === 'saver' && song.audio.saver) return song.audio.saver;
      if (q === 'high' && song.audio.high) return song.audio.high;
      if (song.audio.normal) return song.audio.normal;
      // fallback ke salah satu yang ada
      return song.audio.saver || song.audio.high || song.src || '';
    }
    return song.src || '';
  }

  function getState() {
    return {
      currentId, current: current(),
      isPlaying, shuffle, repeatMode,
      currentTime: audio ? audio.currentTime || 0 : 0,
      duration: audio && Number.isFinite(audio.duration) ? audio.duration : 0,
      volume: audio ? audio.volume : getVolume(),
      muted: audio ? audio.muted : false,
      queue: typeof QueueModule !== 'undefined' ? QueueModule.getAll() : [],
      queueSongs: typeof QueueModule !== 'undefined' ? QueueModule.toSongs() : []
    };
  }

  function load(id, autoplay) {
    const song = resolveSong(id);
    if (!song || !audio) return false;
    const same = String(currentId) === String(id);
    currentId = song.id;
    const src = getSongSrc(song);
    if (!same || audio.src !== src) {
      // hanya ubah src jika berbeda — hindari reload tak perlu
      // Gunakan path relatif; browser + SW akan handle cache hemat
      const abs = new URL(src, location.href).href;
      if (audio.src !== abs) {
        audio.src = src;
        audio.load();
      }
    }
    pushRecentlyPlayed(song.id);
    // untuk algoritma auto random cerdas
    if (typeof SmartShuffle !== 'undefined' && SmartShuffle.incPlayCount) {
      try { SmartShuffle.incPlayCount(song.id); } catch (e) {}
    }
    emit('track');
    emit('progress');
    emit('queue');
    if (autoplay) play();
    return true;
  }

  function play() {
    if (!audio) return;
    if (currentId === null) {
      // jika ada queue, ambil dari queue dulu
      if (typeof QueueModule !== 'undefined' && QueueModule.length()) {
        const nid = QueueModule.shift();
        if (nid !== null) { load(nid, true); return; }
      }
      if (library.length) load(library[0].id, true);
      return;
    }
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { isPlaying = false; emit('state'); });
    }
  }

  function pause() {
    if (audio) audio.pause();
  }

  function toggle() {
    if (isPlaying) pause();
    else play();
  }

  function indexInLibrary(id) {
    return library.findIndex((s) => String(s.id) === String(id));
  }

  function pickRandom(excludeId) {
    if (library.length === 0) return null;
    if (library.length === 1) return library[0];
    let next = null;
    let guard = 0;
    do {
      next = library[Math.floor(Math.random() * library.length)];
      guard++;
    } while (String(next.id) === String(excludeId) && guard < 10);
    return next;
  }

  function next(auto) {
    if (!library.length && !(typeof QueueModule !== 'undefined' && QueueModule.length())) return;
    // 1) Jika queue ada, itu prioritas utama (sesuai spec playlist -> queue)
    if (typeof QueueModule !== 'undefined' && QueueModule.length()) {
      const nid = QueueModule.shift();
      if (nid !== null) { load(nid, true); return; }
    }
    if (currentId === null) { if (library.length) load(library[0].id, true); return; }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexInLibrary(currentId);
    if (i === -1) { if (library.length) load(library[0].id, true); return; }
    if (i < library.length - 1) {
      load(library[i + 1].id, true);
    } else {
      if (repeatMode === 'all') load(library[0].id, true);
      else if (auto) { pause(); if (audio) audio.currentTime = 0; emit('progress'); }
      else load(library[0].id, true);
    }
  }

  function prev() {
    if (!library.length || !audio) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      emit('progress');
      return;
    }
    if (currentId === null) { load(library[0].id, true); return; }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexInLibrary(currentId);
    if (i > 0) load(library[i - 1].id, true);
    else { audio.currentTime = 0; play(); }
  }

  function handleEnded() {
    if (repeatMode === 'one') {
      if (audio) { audio.currentTime = 0; play(); }
      return;
    }
    // queue dulu
    if (typeof QueueModule !== 'undefined' && QueueModule.length()) {
      const nid = QueueModule.shift();
      if (nid !== null) { load(nid, true); return; }
    }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexInLibrary(currentId);
    if (i === -1) return;
    if (i < library.length - 1) {
      load(library[i + 1].id, true);
    } else {
      if (repeatMode === 'all') load(library[0].id, true);
      else { isPlaying = false; emit('state'); }
    }
  }

  function seek(frac) {
    if (!audio || !Number.isFinite(audio.duration) || audio.duration === 0) return;
    const f = Math.min(1, Math.max(0, Number(frac)));
    audio.currentTime = f * audio.duration;
    emit('progress');
  }

  function seekByTime(sec) {
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, Number(sec)));
    emit('progress');
  }

  function setVolume(v) {
    if (!audio) return;
    const n = Math.min(1, Math.max(0, Number(v)));
    audio.volume = n;
    if (n > 0) audio.muted = false;
    saveVolume(n);
    emit('state');
  }

  function toggleMute() {
    if (!audio) return;
    audio.muted = !audio.muted;
    emit('state');
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    saveShuffleState(shuffle);
    emit('state');
    return shuffle;
  }

  function cycleRepeat() {
    repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    saveRepeatMode(repeatMode);
    emit('state');
    return repeatMode;
  }

  function setLibrary(list) {
    library = Array.isArray(list) ? list.slice() : [];
  }

  return {
    init, on, load, play, pause, toggle, next, prev,
    seek, seekByTime, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, current, getState, setLibrary, getSongSrc
  };
})();
