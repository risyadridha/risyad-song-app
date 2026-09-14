/* Risyad Music — queue.js
 * Antrian pemutaran berbasis ID lagu (ringan, tanpa menyimpan object lengkap).
 * - queue: array of song ids (number or string)
 * - Mendukung: push (Add to Queue), unshift (Play Next), remove, clear, shift (next)
 * - Otomatis melanjutkan ke lagu berikutnya saat lagu selesai (via Player)
 * - Tidak disimpan ke localStorage (volatile), agar hemat & tidak membesar tanpa batas.
 */
const QueueModule = (function () {
  let q = [];
  const listeners = [];

  function normId(id) {
    // songs.js pakai number, tapi toleran terhadap string "1" / "song-1"
    if (id === null || id === undefined) return null;
    const n = Number(id);
    if (Number.isFinite(n) && String(n) === String(id).trim()) return n;
    // jika id seperti "song-1", coba ambil angkanya
    const m = String(id).match(/(\d+)/);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v)) return v;
    }
    return id;
  }

  function isValidId(id) {
    const nid = normId(id);
    if (nid === null) return false;
    // cek ada di songs
    return songs.some((s) => s.id === nid || String(s.id) === String(nid));
  }

  function emit() {
    const snap = q.slice();
    listeners.forEach((fn) => { try { fn(snap); } catch (e) {} });
  }

  function on(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function getAll() {
    return q.slice();
  }

  function setAll(ids) {
    if (!Array.isArray(ids)) ids = [];
    q = ids.map(normId).filter((id) => id !== null && isValidId(id));
    emit();
    return getAll();
  }

  function push(id) {
    const nid = normId(id);
    if (nid === null || !isValidId(nid)) return false;
    q.push(nid);
    emit();
    return true;
  }

  function playNext(id) {
    const nid = normId(id);
    if (nid === null || !isValidId(nid)) return false;
    q.unshift(nid);
    emit();
    return true;
  }

  // untuk playlist: set queue bulk tanpa emit berulang
  function setQueueBulk(ids) {
    return setAll(ids);
  }

  function shift() {
    if (!q.length) return null;
    const v = q.shift();
    emit();
    return v;
  }

  function peek() {
    return q.length ? q[0] : null;
  }

  function removeAt(idx) {
    if (idx < 0 || idx >= q.length) return false;
    q.splice(idx, 1);
    emit();
    return true;
  }

  function removeId(id) {
    const nid = normId(id);
    const i = q.indexOf(nid);
    if (i === -1) return false;
    q.splice(i, 1);
    emit();
    return true;
  }

  function clear() {
    q = [];
    emit();
  }

  function length() {
    return q.length;
  }

  function has(id) {
    return q.indexOf(normId(id)) !== -1;
  }

  function move(fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= q.length || toIdx < 0 || toIdx >= q.length) return false;
    const [item] = q.splice(fromIdx, 1);
    q.splice(toIdx, 0, item);
    emit();
    return true;
  }

  function toSongs() {
    return q.map((id) => songs.find((s) => s.id === id || String(s.id) === String(id))).filter(Boolean);
  }

  return {
    getAll, setAll, setQueueBulk,
    push, playNext,
    shift, peek, removeAt, removeId, clear, length, has, move, on, toSongs,
    normId
  };
})();
