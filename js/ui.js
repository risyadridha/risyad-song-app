/* Kirana — ui.js (redesign: natural, hierarchy jelas, tanpa emoji)
 * Render Home / Search / Liked / Library + update player.
 * Progress hanya menyentuh elemen player (tanpa full re-render).
 */
const UI = (function () {
  const $ = (id) => document.getElementById(id);
  let liked = [];
  let toastTimer = null;

  const HEART_OUTLINE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20C7.5 16.5 4 13.3 4 9.3 4 6.8 6 5 8.2 5c1.5 0 2.9.8 3.8 2.1C12.9 5.8 14.3 5 15.8 5 18 5 20 6.8 20 9.3c0 4-3.5 7.2-8 10.7Z"/></svg>';
  const HEART_FILLED = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 20C7.5 16.5 4 13.3 4 9.3 4 6.8 6 5 8.2 5c1.5 0 2.9.8 3.8 2.1C12.9 5.8 14.3 5 15.8 5 18 5 20 6.8 20 9.3c0 4-3.5 7.2-8 10.7Z"/></svg>';
  const PLAY_SM = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg>';

  function esc(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function songById(id) {
    return songs.find((s) => s.id === id) || null;
  }

  function isLiked(id) {
    return liked.indexOf(id) !== -1;
  }

  function toggleLike(id) {
    const i = liked.indexOf(id);
    if (i === -1) { liked.push(id); toast('Added to Liked'); }
    else { liked.splice(i, 1); toast('Removed from Liked'); }
    saveLikedSongs(liked);
    refreshLikeButtons();
    renderLiked();
    renderLibrary();
  }

  function paintHeart(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-liked', on);
    btn.classList.toggle('is-on', on);
    btn.innerHTML = on ? HEART_FILLED : HEART_OUTLINE;
    btn.setAttribute('aria-label', on ? 'Unlike' : 'Like');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function refreshLikeButtons() {
    document.querySelectorAll('[data-like]').forEach((btn) => {
      paintHeart(btn, isLiked(Number(btn.getAttribute('data-like'))));
    });
    syncPlayerLike();
  }

  function songRow(song, idx, activeId) {
    const active = song.id === activeId ? ' is-active' : '';
    const likeOn = isLiked(song.id);
    return '' +
      '<div class="song-row' + active + '" data-song="' + song.id + '" role="button" tabindex="0" aria-label="Putar ' + esc(song.title) + '">' +
        '<span class="idx">' + String(idx + 1).padStart(2, '0') + '</span>' +
        '<img src="' + esc(song.cover) + '" alt="" loading="lazy" onerror="this.src=\'assets/icons/icon-192.png\'" />' +
        '<div class="s-meta"><strong>' + esc(song.title) + '</strong><span>' + esc(song.artist) + '</span></div>' +
        '<span class="s-album">' + esc(song.album || '') + '</span>' +
        '<span style="display:flex;gap:2px;align-items:center">' +
          '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<button class="row-like' + (likeOn ? ' is-liked' : '') + '" data-like="' + song.id + '" aria-label="Like">' + (likeOn ? HEART_FILLED : HEART_OUTLINE) + '</button>' +
        '</span>' +
      '</div>';
  }

  function albumCard(song) {
    return '' +
      '<button class="album" data-song="' + song.id + '" aria-label="Putar ' + esc(song.title) + '">' +
        '<span class="album-cover">' +
          '<img src="' + esc(song.cover) + '" alt="" loading="lazy" onerror="this.src=\'assets/icons/icon-192.png\'" />' +
          '<span class="album-play">' + PLAY_SM + '</span>' +
        '</span>' +
        '<strong>' + esc(song.title) + '</strong>' +
        '<span>' + esc(song.artist) + '</span>' +
      '</button>';
  }

  function listOrEmpty(arr, activeId, emptyTitle, emptyDesc) {
    if (!arr.length) {
      return '<div class="empty"><strong>' + esc(emptyTitle) + '</strong>' + esc(emptyDesc) + '</div>';
    }
    return '<div class="song-list">' + arr.map((s, i) => songRow(s, i, activeId)).join('') + '</div>';
  }

  function renderHome(activeId) {
    const el = $('page-home');
    if (!el) return;
    const recentIds = getRecentlyPlayed();
    const recent = recentIds.map(songById).filter(Boolean).slice(0, 4);
    const popular = songs.filter((s) => (s.category || '').toLowerCase() === 'popular');
    const popularList = popular.length ? popular : songs.slice();
    el.innerHTML =
      '<div class="greet"><p>' + greeting() + '</p><h1>What do you want to hear?</h1></div>' +
      '<div class="section"><div class="section-head"><h2>Recently played</h2><span class="count">' + recent.length + '</span></div>' +
        (recent.length
          ? '<div class="album-grid">' + recent.map(albumCard).join('') + '</div>'
          : '<div class="empty"><strong>No recent plays yet</strong>Play a song and it will appear here.</div>') +
      '</div>' +
      '<div class="section"><div class="section-head"><h2>Popular</h2><span class="count">' + popularList.length + ' songs</span></div>' +
        listOrEmpty(popularList, activeId, 'Empty', 'No popular songs yet.') +
      '</div>' +
      '<div class="section"><div class="section-head"><h2>All songs</h2><span class="count">' + songs.length + ' songs</span></div>' +
        listOrEmpty(songs, activeId, 'Empty', 'Add songs in js/songs.js.') +
      '</div>';
  }

  function renderSearchResults(query, activeId) {
    const box = $('searchResults');
    if (!box) return;
    const q = (query || '').trim();
    if (!q) {
      box.innerHTML = '<div class="empty"><strong>Start typing to search</strong>Results come instantly from your local collection.</div>';
      return;
    }
    const res = SearchModule.filterSongs(q, songs);
    if (!res.length) {
      box.innerHTML = '<div class="empty"><strong>No results for &ldquo;' + esc(q) + '&rdquo;</strong>Try another title, artist, or album.</div>';
      return;
    }
    box.innerHTML = '<div class="section-head" style="margin-top:20px"><h2>Results</h2><span class="count">' + res.length + '</span></div>' +
      listOrEmpty(res, activeId, 'Empty', '');
  }

  function renderLiked(activeId) {
    const el = $('page-liked');
    if (!el) return;
    const arr = liked.map(songById).filter(Boolean);
    el.innerHTML =
      '<h1 class="page-title">Liked</h1><p class="page-sub">Saved on this device.</p>' +
      '<div class="section" style="margin-top:24px">' +
      listOrEmpty(arr, activeId, 'Nothing liked yet', 'Tap the heart on a song to keep it here.') +
      '</div>';
  }

  let libTab = 'all';
  function renderLibrary(activeId) {
    const el = $('page-library');
    if (!el) return;
    const recent = getRecentlyPlayed().map(songById).filter(Boolean);
    const likedArr = liked.map(songById).filter(Boolean);
    let body = '';
    if (libTab === 'liked') body = listOrEmpty(likedArr, activeId, 'No liked songs', 'Tap the heart to add.');
    else if (libTab === 'recent') body = '<div class="album-grid" style="margin-bottom:24px">' + recent.slice(0, 4).map(albumCard).join('') + '</div>' + listOrEmpty(recent, activeId, 'No history', 'Play a song to fill your history.');
    else body = listOrEmpty(songs, activeId, 'Empty', '');
    el.innerHTML =
      '<h1 class="page-title">Library</h1><p class="page-sub">All songs, liked, and recent.</p>' +
      '<div class="lib-tabs" role="tablist">' +
        '<button class="lib-tab' + (libTab === 'all' ? ' is-active' : '') + '" data-lib="all">All</button>' +
        '<button class="lib-tab' + (libTab === 'liked' ? ' is-active' : '') + '" data-lib="liked">Liked · ' + likedArr.length + '</button>' +
        '<button class="lib-tab' + (libTab === 'recent' ? ' is-active' : '') + '" data-lib="recent">Recent · ' + recent.length + '</button>' +
      '</div>' + body;
  }

  function renderAll(activeId) {
    renderHome(activeId);
    renderLiked(activeId);
    renderLibrary(activeId);
    const q = ($('searchInput') || {}).value || '';
    renderSearchResults(q, activeId);
    markActiveSong(activeId);
  }

  function markActiveSong(activeId) {
    document.querySelectorAll('[data-song]').forEach((el) => {
      const id = Number(el.getAttribute('data-song'));
      el.classList.toggle('is-active', id === activeId);
    });
  }

  function syncPlayerLike() {
    const st = Player.getState();
    const on = st.currentId !== null && isLiked(st.currentId);
    paintHeart($('pLike'), on);
    paintHeart($('fLike'), on);
    const m = $('mLike');
    if (m) paintHeart(m, on);
  }

  function updateTrackUI(state) {
    const s = state.current;
    const title = s ? s.title : 'Pilih lagu untuk diputar';
    const artist = s ? s.artist + ' · ' + s.album : 'Kirana Player';
    const cover = s ? s.cover : 'assets/covers/song-1.jpg';
    if ($('pCover')) $('pCover').src = cover;
    if ($('mCover')) $('mCover').src = cover;
    if ($('fCover')) $('fCover').src = cover;
    if ($('pTitle')) $('pTitle').textContent = title;
    if ($('mTitle')) $('mTitle').textContent = title;
    if ($('fTitle')) $('fTitle').textContent = title;
    if ($('pArtist')) $('pArtist').textContent = artist;
    if ($('mArtist')) $('mArtist').textContent = s ? s.artist : 'Kirana';
    if ($('fArtist')) $('fArtist').textContent = s ? s.artist + ' · ' + s.album : 'Kirana';
    syncPlayerLike();
    markActiveSong(state.currentId);
    renderHome(state.currentId);
    renderLibrary(state.currentId);
    if ('mediaSession' in navigator && s) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.title, artist: s.artist, album: s.album,
          artwork: [{ src: cover, sizes: '600x600', type: 'image/png' }]
        });
      } catch (e) {}
    }
  }

  function paintBtn(btn, playing) {
    if (!btn) return;
    btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  }

  function updateStateUI(state) {
    paintBtn($('btnPlay'), state.isPlaying);
    paintBtn($('mPlay'), state.isPlaying);
    paintBtn($('fPlay'), state.isPlaying);
    [$('btnShuffle'), $('fShuffle')].forEach((b) => { if (b) b.classList.toggle('is-on', state.shuffle); });
    [$('btnRepeat'), $('fRepeat')].forEach((b) => {
      if (!b) return;
      b.classList.toggle('is-on', state.repeatMode !== 'off');
      b.title = 'Repeat: ' + state.repeatMode;
    });
    const badge = $('repeatBadge');
    if (badge) badge.textContent = state.repeatMode === 'one' ? '1' : '';
    [$('btnMute'), $('fMute')].forEach((b) => {
      if (!b) return;
      b.classList.toggle('is-on', state.muted || state.volume === 0);
    });
    const v = Math.round((state.muted ? 0 : state.volume) * 100);
    if ($('volBar') && document.activeElement !== $('volBar')) $('volBar').value = v;
    if ($('fVol') && document.activeElement !== $('fVol')) $('fVol').value = v;
  }

  function updateProgressUI(state) {
    const d = state.duration || 0;
    const c = state.currentTime || 0;
    const frac = d > 0 ? Math.min(1, Math.max(0, c / d)) : 0;
    const pos = Math.round(frac * 1000);
    [['seekBar'], ['fSeek']].forEach(([id]) => {
      const el = $(id);
      if (el && document.activeElement !== el) el.value = pos;
    });
    if ($('curTime')) $('curTime').textContent = fmt(c);
    if ($('durTime')) $('durTime').textContent = fmt(d);
    if ($('fCur')) $('fCur').textContent = fmt(c);
    if ($('fDur')) $('fDur').textContent = fmt(d);
  }

  function initLikes() {
    liked = getLikedSongs();
  }

  return {
    esc, fmt, toast, greeting,
    renderHome, renderSearchResults, renderLiked, renderLibrary, renderAll,
    updateTrackUI, updateStateUI, updateProgressUI,
    toggleLike, isLiked, refreshLikeButtons, markActiveSong,
    initLikes,
    setLibTab(t) { libTab = t; },
    get liked() { return liked; }
  };
})();
