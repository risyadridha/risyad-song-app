/* Kirana Music — storage.js
 * Helper localStorage yang aman (tahan data corrupt/kosong).
 * Hanya menyimpan: likedSongs, recentlyPlayed, volume, shuffleState, repeatMode.
 */
const StorageKeys = {
  LIKED: 'kirana.likedSongs',
  RECENT: 'kirana.recentlyPlayed',
  VOLUME: 'kirana.volume',
  SHUFFLE: 'kirana.shuffleState',
  REPEAT: 'kirana.repeatMode'
};

const MAX_RECENT = 20;

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function getLikedSongs() {
  const v = getStorage(StorageKeys.LIKED, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'number') : [];
}

function saveLikedSongs(ids) {
  const clean = Array.isArray(ids) ? ids.filter((x) => typeof x === 'number') : [];
  return setStorage(StorageKeys.LIKED, clean);
}

function getRecentlyPlayed() {
  const v = getStorage(StorageKeys.RECENT, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'number').slice(0, MAX_RECENT) : [];
}

function saveRecentlyPlayed(ids) {
  const clean = Array.isArray(ids) ? ids.filter((x) => typeof x === 'number').slice(0, MAX_RECENT) : [];
  return setStorage(StorageKeys.RECENT, clean);
}

function pushRecentlyPlayed(id) {
  if (typeof id !== 'number') return getRecentlyPlayed();
  const cur = getRecentlyPlayed();
  // Hindari duplikat berurutan: jika paling atas sama, tidak perlu update.
  if (cur[0] === id) return cur;
  const next = [id].concat(cur.filter((x) => x !== id)).slice(0, MAX_RECENT);
  saveRecentlyPlayed(next);
  return next;
}

function getVolume() {
  const v = getStorage(StorageKeys.VOLUME, 0.9);
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
  return 0.9;
}

function saveVolume(v) {
  const n = Math.min(1, Math.max(0, Number(v)));
  if (!Number.isFinite(n)) return false;
  return setStorage(StorageKeys.VOLUME, n);
}

function getShuffleState() {
  return getStorage(StorageKeys.SHUFFLE, false) === true;
}

function saveShuffleState(on) {
  return setStorage(StorageKeys.SHUFFLE, on === true);
}

function getRepeatMode() {
  const v = getStorage(StorageKeys.REPEAT, 'off');
  return v === 'all' || v === 'one' ? v : 'off';
}

function saveRepeatMode(mode) {
  const m = mode === 'all' || mode === 'one' ? mode : 'off';
  return setStorage(StorageKeys.REPEAT, m);
}
