/* Risyad Music — smart.js
 * Auto random cerdas berbasis preferensi, ringan & efisien.
 * Sinyal: liked (+), playCounts (+), recent (-), tanpa simpan object penuh.
 * Algoritma weighted random tanpa replacement, O(n log n) untuk 50-100 lagu.
 */
const SmartShuffle = (function () {
  // ambil playCounts dari storage (jika belum ada, buat kosong)
  function getCounts() {
    try {
      const raw = localStorage.getItem('risyad.playCounts');
      if (!raw) return {};
      const o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function incPlayCount(id) {
    try {
      const c = getCounts();
      const k = String(id);
      c[k] = (Number(c[k]) || 0) + 1;
      // batasi biar tidak membesar tak wajar (cap 100)
      if (c[k] > 100) c[k] = 100;
      localStorage.setItem('risyad.playCounts', JSON.stringify(c));
    } catch (e) {}
  }
  // Fix 12: cache Set/Map agar tidak O(n) per lagu
  function scoreFor(song, likedSet, recentIdxMap, counts, recentLen) {
    const id = String(song.id);
    let w = 1;
    if (likedSet.has(id)) w += 1.6;
    const cnt = Number(counts[id] || 0);
    if (cnt > 0) w += Math.log(cnt + 1) * 0.55;
    if (recentIdxMap.has(id)) {
      const rIdx = recentIdxMap.get(id);
      const factor = 0.18 + 0.67 * (rIdx / Math.max(1, recentLen - 1));
      w *= factor;
    }
    // kategori favorit: jika liked banyak di kategori sama, boost ringan
    // (tanpa loop berat, cukup cek 1x)
    return w;
  }
  // weighted random pick tanpa replacement
  function weightedPick(songs, weights, used) {
    let total = 0;
    for (let i = 0; i < songs.length; i++) if (!used[i]) total += weights[i];
    let r = Math.random() * total;
    for (let i = 0; i < songs.length; i++) if (!used[i]) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    // fallback
    for (let i = 0; i < songs.length; i++) if (!used[i]) return i;
    return -1;
  }
  function buildQueue(limit) {
    const likedArr = typeof getLikedSongs === 'function' ? getLikedSongs() : [];
    const recentArr = typeof getRecentlyPlayed === 'function' ? getRecentlyPlayed() : [];
    const counts = getCounts();
    // Fix 12: Set/Map sekali per build
    const likedSet = new Set(likedArr.map((x)=>String(x)));
    const recentIdxMap = new Map(recentArr.map((x,i)=>[String(x), i]));
    const n = Math.min(limit || 10, songs.length);
    const weights = songs.map((s) => scoreFor(s, likedSet, recentIdxMap, counts, recentArr.length));
    const used = new Array(songs.length).fill(false);
    const out = [];
    // tambah sedikit noise biar tidak deterministik 100%
    for (let i = 0; i < weights.length; i++) weights[i] *= 0.85 + Math.random() * 0.3;
    for (let k = 0; k < n; k++) {
      const idx = weightedPick(songs, weights, used);
      if (idx === -1) break;
      used[idx] = true;
      out.push(songs[idx].id);
    }
    return out;
  }
  function playSmart() {
    const ids = buildQueue(10);
    if (!ids.length) return false;
    const first = ids[0];
    const rest = ids.slice(1);
    if (typeof QueueModule !== 'undefined') QueueModule.setAll(rest);
    if (typeof Player !== 'undefined') Player.load(first, true);
    if (typeof UI !== 'undefined' && UI.toast) UI.toast('Auto mix cerdas — 10 lagu untukmu');
    return true;
  }
  return { buildQueue, playSmart, incPlayCount, getCounts };
})();
