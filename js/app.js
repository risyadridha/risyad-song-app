/* Risyad Music — app.js (entry point) — patched senior fixes 1,4,5,10 */
(function () {
  const $ = (id) => document.getElementById(id);
  let _inited = false;
  let _clockInterval = null;

  function safeOn(id, evt, fn, opts) {
    const el = $(id);
    if (!el) return false;
    el.addEventListener(evt, fn, opts);
    return true;
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
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
    const main = $('main');
    if (main) main.scrollTop = 0;
    window.scrollTo({ top: 0 });
    if (name === 'search') {
      setTimeout(() => { const i = $('searchInput'); if (i && window.innerWidth > 640) i.focus({ preventScroll: true }); }, 60);
    }
  }

  function isAnyOverlayOpen() {
    const fp = $('fullPlayer');
    const qd = $('queueDrawer');
    const fpOpen = fp && fp.classList.contains('open');
    const qOpen = qd && qd.classList.contains('open');
    return fpOpen || qOpen;
  }

  function openFullPlayer(open) {
    const fp = $('fullPlayer');
    if (!fp) return;
    const isOpen = open === true;
    fp.classList.toggle('open', isOpen);
    fp.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    // Fix 4: only remove lock if no overlay remains open
    if (isOpen) {
      document.documentElement.classList.add('fp-lock');
      fp.scrollTop = 0;
      startClock();
    } else {
      // delay check to allow queue drawer state
      setTimeout(() => {
        if (!isAnyOverlayOpen()) document.documentElement.classList.remove('fp-lock');
      }, 50);
      stopClock();
    }
  }

  function startClock() {
    stopClock();
    // Fix 5: clock hanya saat fullPlayer open, bukan 24/7
    const tick = () => {
      const s = Player.getState();
      if (typeof UI !== 'undefined' && UI.updateTrackUI) {
        // hanya update pill, tidak full rebuild
        const pill = $('fpPill');
        if (pill) {
          const now = new Date();
          pill.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        }
      }
    };
    tick();
    _clockInterval = setInterval(tick, 60000);
  }
  function stopClock() {
    if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; }
  }

  function bindNav() {
    document.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const jump = btn.getAttribute('data-lib-jump');
        if (jump) {
          UI.setLibTab(jump);
          UI.renderLibrary(Player.getState().currentId);
        }
        if (btn.getAttribute('data-page') === 'playlists') {
          UI.setSelectedPlId(null);
          UI.renderPlaylists(Player.getState().currentId);
        }
        const pj = btn.getAttribute('data-page-jump');
        if (pj) { showPage(pj); return; }
        showPage(btn.getAttribute('data-page'));
      });
    });
    document.addEventListener('click', (e) => {
      const smart = e.target.closest('#smartPlayBtn');
      if (smart) { if (typeof SmartShuffle !== 'undefined') SmartShuffle.playSmart(); return; }
      const jp = e.target.closest('[data-page-jump]');
      if (jp) { showPage(jp.getAttribute('data-page-jump')); return; }
      const plCard = e.target.closest('[data-pl]');
      if (plCard) {
        UI.setSelectedPlId(plCard.getAttribute('data-pl'));
        UI.renderPlaylists(Player.getState().currentId);
        showPage('playlists');
        return;
      }
      const lib = e.target.closest('[data-lib]');
      if (lib) {
        UI.setLibTab(lib.getAttribute('data-lib'));
        UI.renderLibrary(Player.getState().currentId);
        return;
      }
      const likeBtn = e.target.closest('[data-like]');
      if (likeBtn) {
        e.stopPropagation();
        const raw = likeBtn.getAttribute('data-like');
        const id = isNaN(Number(raw)) ? raw : Number(raw);
        UI.toggleLike(id);
        return;
      }
      const moreBtn = e.target.closest('[data-more]');
      if (moreBtn) {
        e.stopPropagation();
        const raw = moreBtn.getAttribute('data-more');
        const id = isNaN(Number(raw)) ? raw : Number(raw);
        UI.openSongMenu(id);
        return;
      }
      const plRemove = e.target.closest('[data-pl-remove]');
      if (plRemove) {
        e.stopPropagation();
        const raw = plRemove.getAttribute('data-pl-remove');
        const sid = isNaN(Number(raw)) ? raw : Number(raw);
        const pid = UI.selectedPlId;
        if (pid && PlaylistsModule.removeFromPlaylist(pid, sid)) {
          UI.toast('Dihapus dari playlist');
          UI.renderPlaylists(Player.getState().currentId);
        }
        return;
      }
      const row = e.target.closest('[data-song]');
      if (row) {
        const raw = row.getAttribute('data-song');
        const id = isNaN(Number(raw)) ? raw : Number(raw);
        Player.load(id, true);
      }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-song]')) {
        e.preventDefault();
        const raw = e.target.getAttribute('data-song');
        const id = isNaN(Number(raw)) ? raw : Number(raw);
        Player.load(id, true);
      }
      if (e.key === 'Escape') {
        UI.closeSongMenu(); UI.closeAddToPlModal(); UI.closeCreateModal(); UI.closeQueueDrawer(); UI.closeTimerModal(); openFullPlayer(false);
        // Fix 4: pastikan lock hilang jika queue juga tertutup
        setTimeout(() => { if (!isAnyOverlayOpen()) document.documentElement.classList.remove('fp-lock'); }, 50);
      }
    });
  }

  function bindPlayerControls() {
    // Fix 1: guard null — tidak crash kalau ID tidak ada
    safeOn('btnPlay','click', () => Player.toggle());
    safeOn('mPlay','click', (e) => { e.stopPropagation(); Player.toggle(); });
    safeOn('fPlay','click', () => Player.toggle());
    safeOn('btnNext','click', () => Player.next(false));
    safeOn('fNext','click', () => Player.next(false));
    safeOn('btnPrev','click', () => Player.prev());
    safeOn('fPrev','click', () => Player.prev());

    const doShuffle = () => {
      const on = Player.toggleShuffle();
      UI.toast(on ? 'Shuffle: ON' : 'Shuffle: OFF');
    };
    safeOn('btnShuffle','click', doShuffle);
    safeOn('fShuffle','click', doShuffle);

    const doRepeat = () => {
      const m = Player.cycleRepeat();
      UI.toast(m === 'off' ? 'Repeat: OFF' : m === 'all' ? 'Repeat: ALL' : 'Repeat: ONE');
    };
    safeOn('btnRepeat','click', doRepeat);
    safeOn('fRepeat','click', doRepeat);

    const likeCurrent = () => {
      const st = Player.getState();
      if (st.currentId === null) { UI.toast('Putar lagu dulu untuk like'); return; }
      UI.toggleLike(st.currentId);
    };
    safeOn('pLike','click', likeCurrent);
    safeOn('mLike','click', (e) => { e.stopPropagation(); likeCurrent(); });
    safeOn('fLike','click', likeCurrent);

    const seekFrom = (el) => Player.seek(Number(el.value) / 1000);
    safeOn('seekBar','input', (e) => seekFrom(e.target));
    safeOn('fSeek','input', (e) => seekFrom(e.target));
    const fpSeek = $('fpSeek');
    if (fpSeek && fpSeek !== $('fSeek')) fpSeek.addEventListener('input', (e) => seekFrom(e.target));

    safeOn('volBar','input', (e) => Player.setVolume(Number(e.target.value) / 100));
    safeOn('fVol','input', (e) => Player.setVolume(Number(e.target.value) / 100));
    safeOn('btnMute','click', () => Player.toggleMute());
    safeOn('fMute','click', () => Player.toggleMute());

    const fTimer = $('fTimer');
    if (fTimer) fTimer.addEventListener('click', () => UI.openTimerModal());

    ['btnQueue', 'sideQueueBtn', 'mQueue', 'fQueue', 'bottomQueueBtn'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('click', (e) => { e.stopPropagation(); if(el.id==='bottomQueueBtn') e.preventDefault(); UI.openQueueDrawer(); if(!document.documentElement.classList.contains('fp-lock')) document.documentElement.classList.add('fp-lock'); });
    });
    safeOn('queueClose','click', () => {
      UI.closeQueueDrawer();
      if (!isAnyOverlayOpen()) document.documentElement.classList.remove('fp-lock');
    });
    safeOn('queueBackdrop','click', () => {
      UI.closeQueueDrawer();
      if (!isAnyOverlayOpen()) document.documentElement.classList.remove('fp-lock');
    });
    safeOn('queueClear','click', () => { QueueModule.clear(); UI.toast('Queue dikosongkan'); });
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qremove]');
      if (btn) QueueModule.removeAt(Number(btn.getAttribute('data-qremove')));
    });

    safeOn('miniPlayer','click', (e) => { if (e.target.closest('button')) return; openFullPlayer(true); });
    const mini = $('miniPlayer');
    if (mini) mini.addEventListener('keydown', (e) => { if (e.key === 'Enter') openFullPlayer(true); });
    const bp = $('bottomPlayer');
    if (bp) bp.addEventListener('click', (e) => { if (e.target.closest('button') || e.target.closest('input')) return; openFullPlayer(true); });
    safeOn('fpClose','click', () => openFullPlayer(false));

    (function bindSwipe() {
      const fp = $('fullPlayer');
      if (!fp) return;
      let startX = 0, startY = 0, isTouch = false;
      fp.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; isTouch = true;
      }, { passive: true });
      fp.addEventListener('touchend', (e) => {
        if (!isTouch) return; isTouch = false;
        const t = e.changedTouches[0]; const dx = t.clientX - startX; const dy = t.clientY - startY;
        const TH = 60;
        if (Math.abs(dx) < TH) return;
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) Player.next(false); else Player.prev();
      }, { passive: true });
      let startY2 = 0;
      fp.addEventListener('touchstart', (e) => { startY2 = e.touches[0].clientY; }, { passive: true });
      fp.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - startY2;
        if (dy > 90 && Math.abs(e.changedTouches[0].clientX - startX) < 40) openFullPlayer(false);
      }, { passive: true });
    })();

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
    if (!input || !clear) return;
    const onType = SearchModule.debounce(() => {
      UI.renderSearchResults(input.value, Player.getState().currentId);
      clear.classList.toggle('hidden', !input.value);
    }, 160);
    input.addEventListener('input', onType);
    clear.addEventListener('click', () => {
      input.value = ''; clear.classList.add('hidden');
      UI.renderSearchResults('', Player.getState().currentId); input.focus();
    });
  }

  function bindPlaylistsAndMenus() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#plCreateBtn')) { UI.openCreateModal(); return; }
      if (e.target.closest('#plBack')) { UI.setSelectedPlId(null); UI.renderPlaylists(Player.getState().currentId); return; }
      if (e.target.closest('#plPlay')) { const pid=UI.selectedPlId; if(pid){PlaylistsModule.playPlaylist(pid,{shuffle:false}); UI.toast('Memutar playlist');} return; }
      if (e.target.closest('#plShuffle')) { const pid=UI.selectedPlId; if(pid){PlaylistsModule.playPlaylist(pid,{shuffle:true}); UI.toast('Shuffle playlist');} return; }
      if (e.target.closest('#plDelete')) { const pid=UI.selectedPlId; if(pid&&confirm('Hapus playlist ini?')){ const ok=PlaylistsModule.remove(pid); if(!ok) UI.toast('Gagal hapus'); else { UI.setSelectedPlId(null); UI.renderPlaylists(Player.getState().currentId); UI.toast('Playlist dihapus'); } } return; }
      if (e.target.closest('[data-pl-add]')) {
        const pid=e.target.closest('[data-pl-add]').getAttribute('data-pl-add');
        const sid=UI.pendingSongId;
        if(sid!==null){ const ok=PlaylistsModule.addToPlaylist(pid,sid); UI.toast(ok?'Ditambahkan ke playlist':'Sudah ada di playlist / gagal'); if(ok) UI.closeAddToPlModal(); UI.renderPlaylists(Player.getState().currentId); }
        return;
      }
      const tBtn=e.target.closest('[data-timer]');
      if(tBtn){ const m=Number(tBtn.getAttribute('data-timer')); SleepTimer.set(m); UI.updateTimerUI(); const st=SleepTimer.getState(); const el=$('timerStatus'); if(el) el.textContent=st.active? 'Aktif — sisa '+SleepTimer.fmtRemain()+' (akan pause otomatis)':'Timer mati'; return; }
    });
    safeOn('createCancel','click', () => UI.closeCreateModal());
    safeOn('createConfirm','click', () => {
      const name=$('createName').value.trim();
      if(!name){ UI.toast('Nama tidak boleh kosong'); return; }
      const pl=PlaylistsModule.create(name);
      if(!pl){ UI.toast('Gagal buat playlist — storage penuh?'); return; }
      UI.closeCreateModal(); UI.renderPlaylists(Player.getState().currentId); UI.toast('Playlist dibuat');
    });
    const cn=$('createName'); if(cn) cn.addEventListener('keydown', (e)=>{ if(e.key==='Enter') $('createConfirm').click(); });
    safeOn('modalCreate','click', (e)=>{ if(e.target===$('modalCreate')) UI.closeCreateModal(); });
    safeOn('addToPlClose','click', ()=> UI.closeAddToPlModal());
    safeOn('modalAddToPl','click', (e)=>{ if(e.target===$('modalAddToPl')) UI.closeAddToPlModal(); });
    safeOn('songMenuClose','click', ()=> UI.closeSongMenu());
    safeOn('modalSongMenu','click', (e)=>{ if(e.target===$('modalSongMenu')) UI.closeSongMenu(); });
    safeOn('menuPlayNext','click', ()=>{ const id=UI.pendingSongId; if(id!==null&&QueueModule.playNext(id)) UI.toast('Play next'); UI.closeSongMenu(); });
    safeOn('menuAddQueue','click', ()=>{ const id=UI.pendingSongId; if(id!==null&&QueueModule.push(id)) UI.toast('Ditambahkan ke queue'); UI.closeSongMenu(); });
    safeOn('menuAddToPl','click', ()=>{ const id=UI.pendingSongId; UI.closeSongMenu(); if(id!==null) UI.openAddToPlModal(id); });
    safeOn('menuToggleLike','click', ()=>{ const id=UI.pendingSongId; if(id!==null) UI.toggleLike(id); UI.closeSongMenu(); });
    safeOn('timerClose','click', ()=> UI.closeTimerModal());
    safeOn('modalTimer','click', (e)=>{ if(e.target===$('modalTimer')) UI.closeTimerModal(); });
    document.addEventListener('change', (e)=>{ if(e.target.id==='qualitySelect'){ const ok=saveAudioQuality(e.target.value); UI.toast(ok?'Quality: '+e.target.value:'Gagal simpan'); }});
    if(typeof SleepTimer!=='undefined' && SleepTimer.on){
      SleepTimer.on(()=>{ UI.updateTimerUI(); const st=SleepTimer.getState(); const el=$('timerStatus'); if(el) el.textContent=st.active? 'Sisa '+SleepTimer.fmtRemain()+' — akan pause':'Timer mati'; });
    }
  }

  function init() {
    // Fix 10: cegah double init (58 listener jadi 116)
    if (_inited) return; _inited = true;
    registerSW();
    UI.initLikes();
    const audio=$('audioPlayer');
    if (!audio) { console.error('audioPlayer missing'); return; }
    Player.init(audio, songs);
    const volBar=$('volBar'), fVol=$('fVol');
    const v=Math.round(Player.getState().volume*100);
    if (volBar) volBar.value=v; if (fVol) fVol.value=v;
    UI.renderAll(Player.getState().currentId);
    Player.on('track', (st)=> UI.updateTrackUI(st));
    Player.on('state', (st)=> UI.updateStateUI(st));
    Player.on('progress', (st)=> UI.updateProgressUI(st));
    Player.on('queue', (st)=> UI.renderQueue(st));
    const st=Player.getState();
    UI.updateTrackUI(st); UI.updateStateUI(st); UI.updateProgressUI(st); UI.renderQueue(st); UI.updateTimerUI();
    bindNav(); bindPlayerControls(); bindSearch(); bindPlaylistsAndMenus();
    showPage('home');
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); } else { init(); }
  // expose for queueDrawer lock check
  window._isAnyOverlayOpen = isAnyOverlayOpen;
  window.openFullPlayer = openFullPlayer;
})();
