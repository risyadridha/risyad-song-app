/* Kirana Music — player.js
 * Satu elemen audio saja (#audioPlayer). Tidak membuat Audio object baru.
 * Alur: pilih lagu -> ubah audio.src -> play.
 */
const Player = (function () {
  let audio = null;
  let queue = [];
  let currentId = null;
  let isPlaying = false;
  let shuffle = false;
  let repeatMode = 'off'; // off | all | one
  const listeners = { track: [], state: [], progress: [] };

  function init(audioEl, songList) {
    audio = audioEl;
    queue = Array.isArray(songList) ? songList.slice() : [];
    shuffle = getShuffleState();
    repeatMode = getRepeatMode();
    const vol = getVolume();
    audio.volume = vol;
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
    emit('track');
    emit('state');
  }

  function on(evt, fn) {
    if (listeners[evt]) listeners[evt].push(fn);
  }

  function emit(evt) {
    const fns = listeners[evt] || [];
    const snapshot = getState();
    fns.forEach((fn) => { try { fn(snapshot); } catch (e) {} });
  }

  function findById(id) {
    return queue.find((s) => s.id === id) || null;
  }

  function current() {
    return currentId === null ? null : findById(currentId);
  }

  function getState() {
    return {
      currentId, current: current(),
      isPlaying, shuffle, repeatMode,
      currentTime: audio ? audio.currentTime || 0 : 0,
      duration: audio && Number.isFinite(audio.duration) ? audio.duration : 0,
      volume: audio ? audio.volume : getVolume(),
      muted: audio ? audio.muted : false
    };
  }

  function load(id, autoplay) {
    const song = findById(id);
    if (!song || !audio) return false;
    const same = currentId === id;
    currentId = id;
    if (!same) {
      audio.src = song.src;
      audio.load();
    }
    pushRecentlyPlayed(id);
    emit('track');
    emit('progress');
    if (autoplay) play();
    return true;
  }

  function play() {
    if (!audio) return;
    if (currentId === null) {
      if (queue.length) load(queue[0].id, true);
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

  function indexOf(id) {
    return queue.findIndex((s) => s.id === id);
  }

  function pickRandom(excludeId) {
    if (queue.length === 0) return null;
    if (queue.length === 1) return queue[0];
    let next = null;
    let guard = 0;
    do {
      next = queue[Math.floor(Math.random() * queue.length)];
      guard++;
    } while (next.id === excludeId && guard < 10);
    return next;
  }

  function next(auto) {
    if (!queue.length) return;
    if (currentId === null) { load(queue[0].id, true); return; }
    // Jika repeat-one dan ini auto-ended, di-handle di handleEnded. Tombol next manual tetap pindah.
    if (!auto && repeatMode === 'one') {
      // manual next saat repeat-one: tetap pindah sesuai shuffle/urutan
    }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexOf(currentId);
    if (i === -1) { load(queue[0].id, true); return; }
    if (i < queue.length - 1) {
      load(queue[i + 1].id, true);
    } else {
      // lagu terakhir
      if (repeatMode === 'all') load(queue[0].id, true);
      else if (auto) { pause(); if (audio) audio.currentTime = 0; emit('progress'); }
      else load(queue[0].id, true);
    }
  }

  function prev() {
    if (!queue.length || !audio) return;
    // Jika sudah diputar >3 detik, kembali ke awal lagu (perilaku standar player).
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      emit('progress');
      return;
    }
    if (currentId === null) { load(queue[0].id, true); return; }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexOf(currentId);
    if (i > 0) load(queue[i - 1].id, true);
    else { audio.currentTime = 0; play(); }
  }

  function handleEnded() {
    if (repeatMode === 'one') {
      if (audio) { audio.currentTime = 0; play(); }
      return;
    }
    if (shuffle) {
      const n = pickRandom(currentId);
      if (n) { load(n.id, true); return; }
    }
    const i = indexOf(currentId);
    if (i === -1) return;
    if (i < queue.length - 1) {
      load(queue[i + 1].id, true);
    } else {
      if (repeatMode === 'all') load(queue[0].id, true);
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

  function setQueue(list) {
    queue = Array.isArray(list) ? list.slice() : [];
  }

  return {
    init, on, load, play, pause, toggle, next, prev,
    seek, seekByTime, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, current, getState, setQueue
  };
})();
