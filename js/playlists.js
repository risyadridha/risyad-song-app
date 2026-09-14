/* Risyad Music — playlists.js
 * Playlist bawaan (manual di JS) + playlist buatan user (localStorage).
 * Hanya menyimpan ID lagu, bukan object lengkap.
 */
const PlaylistsModule = (function () {
  // ===== Playlist bawaan — edit manual di sini =====
  const builtIn = [
    {
      id: 'built-chill',
      name: 'Chill',
      description: 'Musik santai untuk fokus & istirahat',
      cover: 'assets/covers/song-3.jpg',
      songIds: [3, 4, 5, 6]
    },
    {
      id: 'built-pop',
      name: 'Popular Mix',
      description: 'Pilihan populer dari koleksi',
      cover: 'assets/covers/song-1.jpg',
      songIds: [1, 2, 3, 7, 8]
    },
    {
      id: 'built-malam',
      name: 'Malam Tenang',
      description: 'Teman perjalanan malam',
      cover: 'assets/covers/song-2.jpg',
      songIds: [2, 5, 6, 9]
    }
  ];

  function normId(id) {
    return QueueModule ? QueueModule.normId(id) : id;
  }

  function getBuiltIn() {
    // kembalikan copy agar tidak termutasi
    return builtIn.map((p) => ({ ...p, songIds: p.songIds.slice(), isBuiltIn: true }));
  }

  function getUser() {
    const arr = getStorage(StorageKeys.PLAYLISTS, []);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.songIds))
      .map((p) => ({ id: p.id, name: String(p.name).slice(0, 40), songIds: p.songIds.map(normId).filter((x) => x !== null), isBuiltIn: false }));
  }

  function saveUser(list) {
    const clean = (list || []).map((p) => ({
      id: String(p.id),
      name: String(p.name).slice(0, 40),
      songIds: (p.songIds || []).map(normId).filter((x) => x !== null)
    }));
    return setStorage(StorageKeys.PLAYLISTS, clean);
  }

  function getAll() {
    return getBuiltIn().concat(getUser());
  }

  function getById(id) {
    return getAll().find((p) => p.id === id) || null;
  }

  function isBuiltInId(id) {
    return builtIn.some((p) => p.id === id);
  }

  function create(name) {
    const n = String(name || '').trim();
    if (!n) return null;
    const list = getUser();
    const pl = { id: 'pl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: n, songIds: [] };
    list.push(pl);
    saveUser(list);
    return { ...pl, isBuiltIn: false };
  }

  function rename(id, newName) {
    if (isBuiltInId(id)) return false;
    const n = String(newName || '').trim().slice(0, 40);
    if (!n) return false;
    const list = getUser();
    const p = list.find((x) => x.id === id);
    if (!p) return false;
    p.name = n;
    saveUser(list);
    return true;
  }

  function remove(id) {
    if (isBuiltInId(id)) return false;
    let list = getUser();
    const before = list.length;
    list = list.filter((p) => p.id !== id);
    if (list.length === before) return false;
    saveUser(list);
    return true;
  }

  function addToPlaylist(playlistId, songId) {
    if (isBuiltInId(playlistId)) return false;
    const nid = normId(songId);
    if (nid === null) return false;
    const list = getUser();
    const p = list.find((x) => x.id === playlistId);
    if (!p) return false;
    if (p.songIds.indexOf(nid) !== -1) return false; // sudah ada
    // validasi lagu ada
    if (!songs.some((s) => s.id === nid || String(s.id) === String(nid))) return false;
    p.songIds.push(nid);
    saveUser(list);
    return true;
  }

  function removeFromPlaylist(playlistId, songId) {
    if (isBuiltInId(playlistId)) return false;
    const nid = normId(songId);
    const list = getUser();
    const p = list.find((x) => x.id === playlistId);
    if (!p) return false;
    const i = p.songIds.indexOf(nid);
    if (i === -1) return false;
    p.songIds.splice(i, 1);
    saveUser(list);
    return true;
  }

  function hasSong(playlistId, songId) {
    const pl = getById(playlistId);
    if (!pl) return false;
    return pl.songIds.indexOf(normId(songId)) !== -1;
  }

  // Untuk Play & Shuffle Play terintegrasi queue (tidak mutasi array asli)
  function getShuffle(ids) {
    const copy = ids.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = copy[i]; copy[i] = copy[j]; copy[j] = t;
    }
    return copy;
  }

  function playPlaylist(playlistId, opts) {
    const pl = getById(playlistId);
    if (!pl || !pl.songIds.length) return false;
    let ids = pl.songIds.slice();
    if (opts && opts.shuffle) ids = getShuffle(ids);
    const first = ids[0];
    const rest = ids.slice(1);
    QueueModule.setAll(rest);
    Player.load(first, true);
    return true;
  }

  return {
    getBuiltIn, getUser, getAll, getById, isBuiltInId,
    create, rename, remove, addToPlaylist, removeFromPlaylist, hasSong, playPlaylist
  };
})();
