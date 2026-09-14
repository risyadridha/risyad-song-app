/* Kirana Music — search.js
 * Pencarian real-time dari array lokal, tanpa API/database.
 * Termasuk debounce ringan agar efisien untuk daftar besar.
 */
const SearchModule = (function () {
  function normalize(s) {
    return (s || '').toString().toLowerCase().trim();
  }

  function filterSongs(query, list) {
    const q = normalize(query);
    if (!q) return [];
    return (list || []).filter((s) => {
      return normalize(s.title).includes(q) ||
        normalize(s.artist).includes(q) ||
        normalize(s.album).includes(q);
    });
  }

  function debounce(fn, wait) {
    let t = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait || 180);
    };
  }

  return { filterSongs, debounce, normalize };
})();
