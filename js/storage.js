/* Risyad Music — storage.js — patched fixes 2,16,17 */
const StorageKeys = {
  LIKED: 'risyad.likedSongs',
  RECENT: 'risyad.recentlyPlayed',
  VOLUME: 'risyad.volume',
  SHUFFLE: 'risyad.shuffleState',
  REPEAT: 'risyad.repeatMode',
  PLAYLISTS: 'risyad.playlists.user',
  AUDIO_QUALITY: 'risyad.audioQuality'
};
// Migrasi dari key lama kirana.* → risyad.* (tanpa hapus data user)
(function migrateKeys(){
  const map = {
    'kirana.likedSongs':'risyad.likedSongs',
    'kirana.recentlyPlayed':'risyad.recentlyPlayed',
    'kirana.volume':'risyad.volume',
    'kirana.shuffleState':'risyad.shuffleState',
    'kirana.repeatMode':'risyad.repeatMode',
    'kirana.playlists.user':'risyad.playlists.user',
    'kirana.audioQuality':'risyad.audioQuality'
  };
  try{
    Object.keys(map).forEach((oldK)=>{
      const newK=map[oldK];
      if(localStorage.getItem(newK)===null && localStorage.getItem(oldK)!==null){
        localStorage.setItem(newK, localStorage.getItem(oldK));
      }
    });
  }catch(e){}
})();

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
    // QuotaExceededError → laporkan
    if (e && e.name === 'QuotaExceededError') console.warn('localStorage quota exceeded', key);
    return false;
  }
}

// Fix 2: normalisasi ID → String agar 1 dan "1" tidak duplikat
function normIds(ids){
  if(!Array.isArray(ids)) return [];
  const seen=new Set();
  const out=[];
  ids.forEach((x)=>{
    const s=String(x);
    if(s==='undefined'||s==='null'||s==='') return;
    if(!seen.has(s)){ seen.add(s); out.push(isNaN(Number(s))? s : Number(s)); }
  });
  return out;
}

function getLikedSongs() {
  const v = getStorage(StorageKeys.LIKED, []);
  return Array.isArray(v) ? normIds(v) : [];
}

function saveLikedSongs(ids) {
  const clean = normIds(ids);
  const ok=setStorage(StorageKeys.LIKED, clean);
  if(!ok && typeof UI!=='undefined'&&UI.toast) UI.toast('Gagal simpan Liked — storage penuh');
  return ok;
}

function getRecentlyPlayed() {
  const v = getStorage(StorageKeys.RECENT, []);
  return Array.isArray(v) ? normIds(v).slice(0, MAX_RECENT) : [];
}

function saveRecentlyPlayed(ids) {
  const clean = normIds(ids).slice(0, MAX_RECENT);
  const ok=setStorage(StorageKeys.RECENT, clean);
  if(!ok && typeof UI!=='undefined'&&UI.toast) UI.toast('Gagal simpan Recent — storage penuh');
  return ok;
}

function pushRecentlyPlayed(id) {
  if (id === null || id === undefined) return getRecentlyPlayed();
  const cur = getRecentlyPlayed();
  if (String(cur[0]) === String(id)) return cur;
  const next = [id].concat(cur.filter((x) => String(x) !== String(id))).slice(0, MAX_RECENT);
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

function getAudioQuality() {
  const v = getStorage(StorageKeys.AUDIO_QUALITY, 'normal');
  return v === 'saver' || v === 'high' ? v : 'normal';
}
function saveAudioQuality(q) {
  const v = q === 'saver' || q === 'high' ? q : 'normal';
  const ok=setStorage(StorageKeys.AUDIO_QUALITY, v);
  if(!ok && typeof UI!=='undefined'&&UI.toast) UI.toast('Gagal simpan quality — storage penuh');
  return ok;
}
