/* Kirana Music — app.js (entry point) */
(function () {
  const $ = (id) => document.getElementById(id);

  function registerSW() {
    if ('serviceWorker' in navigator) {
      // Path relatif agar aman dibuka dari subfolder / file:// (SW hanya aktif di http/https).
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      });
    }
  }

  function showPage(name) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('is-visible'));
    const el = $('page-' + name);
    if (el) el.classList.add('is-visible');
    document.querySelectorAll('.nav-item[data-page]').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-page') === name);
    });
    $('main').scrollTop = 0;
    window.scrollTo({ top: 0 });
    if (name === 'search') {
      setTimeout(() => { const i = $('searchInput'); if (i && window.innerWidth > 640) i.focus({ preventScroll: true }); }, 60);
    }
  }

  function openFullPlayer(open) {
    const fp = $('fullPlayer');
    if (!fp) return;
    fp.classList.toggle('open', open === true);
    fp.setAttribute('aria-hidden', open === true ? 'false' : 'true');
  }

  function bindNav() {
    document.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const jump = btn.getAttribute('data-lib-jump');
        if (jump) {
          UI.setLibTab(jump);
          UI.renderLibrary(Player.getState().currentId);
        }
        showPage(btn.getAttribute('data-page'));
      });
    });
    // Event delegation untuk klik lagu / like / tab library (tanpa re-bind tiap render)
    document.addEventListener('click', (e) => {
      const lib = e.target.closest('[data-lib]');
      if (lib) {
        UI.setLibTab(lib.getAttribute('data-lib'));
        UI.renderLibrary(Player.getState().currentId);
        return;
      }
      const likeBtn = e.target.closest('[data-like]');
      if (likeBtn) {
        e.stopPropagation();
        UI.toggleLike(Number(likeBtn.getAttribute('data-like')));
        return;
      }
      const playBtn = e.target.closest('[data-play]');
      if (playBtn) {
        e.stopPropagation();
        Player.load(Number(playBtn.getAttribute('data-play')), true);
        return;
      }
      const row = e.target.closest('[data-song]');
      if (row) {
        Player.load(Number(row.getAttribute('data-song')), true);
      }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-song]')) {
        e.preventDefault();
        Player.load(Number(e.target.getAttribute('data-song')), true);
      }
    });
  }

  function bindPlayerControls() {
    $('btnPlay').addEventListener('click', () => Player.toggle());
    $('mPlay').addEventListener('click', (e) => { e.stopPropagation(); Player.toggle(); });
    $('fPlay').addEventListener('click', () => Player.toggle());
    $('btnNext').addEventListener('click', () => Player.next(false));
    $('fNext').addEventListener('click', () => Player.next(false));
    $('btnPrev').addEventListener('click', () => Player.prev());
    $('fPrev').addEventListener('click', () => Player.prev());

    const doShuffle = () => {
      const on = Player.toggleShuffle();
      UI.toast(on ? 'Shuffle: ON' : 'Shuffle: OFF');
    };
    $('btnShuffle').addEventListener('click', doShuffle);
    $('fShuffle').addEventListener('click', doShuffle);

    const doRepeat = () => {
      const m = Player.cycleRepeat();
      UI.toast(m === 'off' ? 'Repeat: OFF' : m === 'all' ? 'Repeat: ALL ∞' : 'Repeat: ONE 1');
    };
    $('btnRepeat').addEventListener('click', doRepeat);
    $('fRepeat').addEventListener('click', doRepeat);

    const likeCurrent = () => {
      const st = Player.getState();
      if (st.currentId === null) { UI.toast('Putar lagu dulu untuk like'); return; }
      UI.toggleLike(st.currentId);
    };
    $('pLike').addEventListener('click', likeCurrent);
    $('mLike').addEventListener('click', (e) => { e.stopPropagation(); likeCurrent(); });
    $('fLike').addEventListener('click', likeCurrent);

    // Seek (input event ringan, tanpa polling)
    const seekFrom = (el) => Player.seek(Number(el.value) / 1000);
    $('seekBar').addEventListener('input', (e) => seekFrom(e.target));
    $('fSeek').addEventListener('input', (e) => seekFrom(e.target));

    // Volume
    $('volBar').addEventListener('input', (e) => Player.setVolume(Number(e.target.value) / 100));
    $('fVol').addEventListener('input', (e) => Player.setVolume(Number(e.target.value) / 100));
    $('btnMute').addEventListener('click', () => Player.toggleMute());
    $('fMute').addEventListener('click', () => Player.toggleMute());

    // Mini -> full player (mobile)
    $('miniPlayer').addEventListener('click', () => openFullPlayer(true));
    $('miniPlayer').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openFullPlayer(true);
    });
    $('fpClose').addEventListener('click', () => openFullPlayer(false));
    // Swipe down sederhana untuk tutup full player
    let startY = 0;
    const fp = $('fullPlayer');
    fp.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    fp.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 90) openFullPlayer(false);
    }, { passive: true });

    // Media keys / headset / lockscreen
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => Player.play());
        navigator.mediaSession.setActionHandler('pause', () => Player.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => Player.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => Player.next(false));
      } catch (e) {}
    }
  }

  function bindSearch() {
    const input = $('searchInput');
    const clear = $('searchClear');
    const onType = SearchModule.debounce(() => {
      UI.renderSearchResults(input.value, Player.getState().currentId);
      clear.classList.toggle('hidden', !input.value);
    }, 160);
    input.addEventListener('input', onType);
    clear.addEventListener('click', () => {
      input.value = '';
      clear.classList.add('hidden');
      UI.renderSearchResults('', Player.getState().currentId);
      input.focus();
    });
  }

  function init() {
    registerSW();
    UI.initLikes();
    const audio = $('audioPlayer');
    Player.init(audio, songs);

    // Cache volume awal ke slider
    const v = Math.round(Player.getState().volume * 100);
    $('volBar').value = v;
    $('fVol').value = v;

    UI.renderAll(Player.getState().currentId);

    Player.on('track', (st) => UI.updateTrackUI(st));
    Player.on('state', (st) => UI.updateStateUI(st));
    Player.on('progress', (st) => UI.updateProgressUI(st));

    // Sinkron awal
    const st = Player.getState();
    UI.updateTrackUI(st);
    UI.updateStateUI(st);
    UI.updateProgressUI(st);

    bindNav();
    bindPlayerControls();
    bindSearch();
    showPage('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
