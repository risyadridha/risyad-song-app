/* Risyad Music — ui.js (redesign + playlist/queue + lyric/timer/smart)
 * Render Home / Search / Liked / Playlists / Library / Queue
 * Optimal: progress hanya sentuh player, ganti lagu tidak rebuild seluruh Home.
 */
const UI = (function () {
  const $ = (id) => document.getElementById(id);
  let liked = [];
  let toastTimer = null;
  let selectedPlId = null;
  let pendingSongId = null;

  const HEART_OUTLINE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20C7.5 16.5 4 13.3 4 9.3 4 6.8 6 5 8.2 5c1.5 0 2.9.8 3.8 2.1C12.9 5.8 14.3 5 15.8 5 18 5 20 6.8 20 9.3c0 4-3.5 7.2-8 10.7Z"/></svg>';
  const HEART_FILLED = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 20C7.5 16.5 4 13.3 4 9.3 4 6.8 6 5 8.2 5c1.5 0 2.9.8 3.8 2.1C12.9 5.8 14.3 5 15.8 5 18 5 20 6.8 20 9.3c0 4-3.5 7.2-8 10.7Z"/></svg>';
  const PLAY_SM = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg>';
  const MORE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="1.7"/><circle cx="5" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';

  function esc(s) { return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(sec){ if(!Number.isFinite(sec)||sec<0)return'0:00'; const m=Math.floor(sec/60),s=Math.floor(sec%60); return m+':'+String(s).padStart(2,'0');}
  function toast(msg){ const el=$('toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
  function greeting(){ const h=new Date().getHours(); if(h>=5&&h<12)return'Good morning'; if(h>=12&&h<18)return'Good afternoon'; return 'Good evening';}
  function songById(id){
    if(typeof songMap!=='undefined' && songMap.has(String(id))) return songMap.get(String(id));
    return songs.find((s)=>String(s.id)===String(id))||null;
  }
  function isLiked(id){ return liked.some((x)=>String(x)===String(id)); }
  function toggleLike(id){
    const sid=String(id); const idx=liked.findIndex((x)=>String(x)===sid);
    if(idx===-1){ liked.push(Number.isFinite(Number(id))?Number(id):id); toast('Added to Liked'); }
    else { liked.splice(idx,1); toast('Removed from Liked'); }
    saveLikedSongs(liked); refreshLikeButtons(); renderLiked(); renderLibrary();
  }
  function paintHeart(btn,on){
    if(!btn)return; btn.classList.toggle('is-liked',on); btn.classList.toggle('is-on',on);
    btn.innerHTML=on?HEART_FILLED:HEART_OUTLINE; btn.setAttribute('aria-label',on?'Unlike':'Like');
  }
  function refreshLikeButtons(){
    document.querySelectorAll('[data-like]').forEach((btn)=> paintHeart(btn, isLiked(btn.getAttribute('data-like'))));
    syncPlayerLike();
  }
  function getLyric(song){
    if(!song) return '';
    if(song.lyric) return song.lyric;
    // fallback estetik: kutipan ringan dari judul/album
    const map={
      1:'Kau lebih dari teman berbagi',
      2:'Apalah arti menunggu bila kamu tak di sini',
      3:'Body pata pata, gerak pelan menggoda',
      4:'Potret senyummu masih ku simpan',
      5:'Mantan terindah yang tak terlupa',
      6:'Di titik nadir ku sebut namamu',
      7:'Firasat hati tak pernah salah',
      8:'To love you more, setiap nafasku',
      9:'Shape of my heart, jujur yang ku rasa'
    };
    return map[song.id] || song.album || '';
  }

  function songRow(song,idx,activeId){
    const active=String(song.id)===String(activeId)?' is-active':'';
    const likeOn=isLiked(song.id);
    return '<div class="song-row'+active+'" data-song="'+song.id+'" role="button" tabindex="0" aria-label="Putar '+esc(song.title)+'">'
      +'<span class="idx">'+String(idx+1).padStart(2,'0')+'</span>'
      +'<img src="'+esc(song.cover)+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'assets/icons/icon-192.png\'" />'
      +'<div class="s-meta"><strong>'+esc(song.title)+'</strong><span>'+esc(song.artist)+'</span></div>'
      +'<span class="s-album">'+esc(song.album||'')+'</span>'
      +'<button class="row-like'+(likeOn?' is-liked':'')+'" data-like="'+song.id+'" aria-label="Like">'+(likeOn?HEART_FILLED:HEART_OUTLINE)+'</button>'
      +'<button class="row-more" data-more="'+song.id+'" aria-label="More">'+MORE+'</button>'
      +'</div>';
  }
  // Fix 8: decoding async + lazy + esc
  function albumCard(song){
    return '<button class="album" data-song="'+song.id+'" aria-label="Putar '+esc(song.title)+'">'
      +'<span class="album-cover"><img src="'+esc(song.cover)+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'assets/icons/icon-192.png\'" /><span class="album-play">'+PLAY_SM+'</span></span>'
      +'<strong>'+esc(song.title)+'</strong><span>'+esc(song.artist)+'</span></button>';
  }
  function playlistCard(pl){
    const count=(pl.songIds||[]).length; const cover=pl.cover||'assets/covers/song-1.jpg';
    return '<button class="pl-card" data-pl="'+esc(pl.id)+'" aria-label="Buka '+esc(pl.name)+'">'
      +'<img src="'+esc(cover)+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'assets/icons/icon-192.png\'" />'
      +'<div class="pl-card-meta"><strong>'+esc(pl.name)+'</strong><span>'+esc(pl.description||(pl.isBuiltIn?'Playlist bawaan':'Buatan kamu'))+' · '+count+' lagu</span></div></button>';
  }
  // Fix 14: pagination — render 20 awal, tombol load more (hemat DOM/batre untuk 100+)
  let _allLimit = 20;
  function listOrEmpty(arr,activeId,emptyTitle,emptyDesc){
    if(!arr.length) return '<div class="empty"><strong>'+esc(emptyTitle)+'</strong>'+esc(emptyDesc)+'</div>';
    const slice = arr.length > _allLimit && arr === songs ? arr.slice(0,_allLimit) : arr;
    let html='<div class="song-list">'+slice.map((s,i)=>songRow(s,i,activeId)).join('')+'</div>';
    if(arr===songs && arr.length>_allLimit) html+='<button class="btn-ghost" id="loadMoreBtn" style="margin-top:10px">Load more ('+(arr.length-_allLimit)+' lagi)</button>';
    return html;
  }
  function bindLoadMore(){
    const btn=$('loadMoreBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      _allLimit+=20;
      // hanya re-render All songs tanpa rebuild Home penuh
      const allSec=document.querySelector('#page-home .section:last-child');
      if(allSec) allSec.outerHTML='<div class="section"><div class="section-head"><h2>All songs</h2><span class="count">'+songs.length+' songs</span></div>'+listOrEmpty(songs, Player.getState().currentId, 'Empty','Add songs in js/songs.js.')+'</div>';
      bindLoadMore();
    });
  }

  // Patch ringan untuk recent tanpa rebuild Home penuh (hemat 60fps di HP)
  function patchRecent(activeId){
    const wrap=$('recentGrid'); if(!wrap) return;
    const recentIds=getRecentlyPlayed(); const recent=recentIds.map(songById).filter(Boolean).slice(0,4);
    const headId=$('recentCount');
    if(headId) headId.textContent=String(recent.length);
    if(!recent.length){ wrap.innerHTML='<div class="empty"><strong>No recent plays yet</strong>Play a song and it will appear here.</div>'; return; }
    wrap.innerHTML='<div class="album-grid">'+recent.map(albumCard).join('')+'</div>';
  }

  function renderHome(activeId){
    const el=$('page-home'); if(!el) return;
    const recentIds=getRecentlyPlayed(); const recent=recentIds.map(songById).filter(Boolean).slice(0,4);
    const popular=songs.filter((s)=>(s.category||'').toLowerCase()==='popular'); const popularList=popular.length?popular:songs.slice();
    const pls=PlaylistsModule?PlaylistsModule.getAll().slice(0,2):[];
    el.innerHTML=
      '<div class="greet"><p>'+greeting()+'</p><h1>What do you want to hear?</h1></div>'
      +'<div class="section"><div class="section-head"><h2>Untuk kamu</h2><span class="count">Auto mix</span></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-primary" id="smartPlayBtn">▶ Auto random cerdas</button><span style="color:var(--muted);font-size:12.5px;align-self:center">Berdasarkan like & riwayat — tanpa mengulang yang baru diputar</span></div></div>'
      +(pls.length?'<div class="section"><div class="section-head"><h2>Playlists</h2><button class="text-btn" data-page-jump="playlists">See all</button></div><div class="playlist-grid">'+pls.map(playlistCard).join('')+'</div></div>':'')
      +'<div class="section"><div class="section-head"><h2>Recently played</h2><span class="count" id="recentCount">'+recent.length+'</span></div><div id="recentGrid">'
      +(recent.length?'<div class="album-grid">'+recent.map(albumCard).join('')+'</div>':'<div class="empty"><strong>No recent plays yet</strong>Play a song and it will appear here.</div>')
      +'</div></div>'
      +'<div class="section"><div class="section-head"><h2>Popular</h2><span class="count">'+popularList.length+' songs</span></div>'+listOrEmpty(popularList,activeId,'Empty','No popular songs yet.')+'</div>'
      +'<div class="section"><div class="section-head"><h2>All songs</h2><span class="count">'+songs.length+' songs</span></div>'+listOrEmpty(songs,activeId,'Empty','Add songs in js/songs.js.')+'</div>';
    // Fix 14: bind load more setelah render
    setTimeout(bindLoadMore,0);
  }
  function renderSearchResults(query,activeId){
    const box=$('searchResults'); if(!box) return; const q=(query||'').trim();
    if(!q){ box.innerHTML='<div class="empty"><strong>Start typing to search</strong>Results come instantly from your local collection.</div>'; return; }
    const res=SearchModule.filterSongs(q,songs);
    if(!res.length){ box.innerHTML='<div class="empty"><strong>No results for &ldquo;'+esc(q)+'&rdquo;</strong>Try another title, artist, or album.</div>'; return; }
    box.innerHTML='<div class="section-head" style="margin-top:20px"><h2>Results</h2><span class="count">'+res.length+'</span></div>'+listOrEmpty(res,activeId,'Empty','');
  }
  function renderLiked(activeId){
    const el=$('page-liked'); if(!el) return; const arr=liked.map(songById).filter(Boolean);
    el.innerHTML='<h1 class="page-title">Liked</h1><p class="page-sub">Saved on this device.</p><div class="section" style="margin-top:24px">'+listOrEmpty(arr,activeId,'Nothing liked yet','Tap the heart on a song to keep it here.')+'</div>';
  }
  function renderPlaylists(activeId){
    const el=$('page-playlists'); if(!el) return;
    if(selectedPlId){
      const pl=PlaylistsModule.getById(selectedPlId); if(!pl){ selectedPlId=null; return renderPlaylists(activeId); }
      const songList=pl.songIds.map(songById).filter(Boolean); const isBuilt=pl.isBuiltIn;
      el.innerHTML='<button class="text-btn" id="plBack" style="margin-bottom:12px">← Back to playlists</button>'
        +'<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px"><img src="'+esc(pl.cover||'assets/covers/song-1.jpg')+'" alt="" style="width:96px;height:96px;border-radius:10px;object-fit:cover" onerror="this.src=\'assets/icons/icon-192.png\'" />'
        +'<div><h1 class="page-title" style="font-size:20px">'+esc(pl.name)+'</h1><p class="page-sub">'+esc(pl.description||'')+' · '+songList.length+' lagu'+(isBuilt?' · Built-in':'')+'</p><div class="pl-actions"><button class="btn-primary" id="plPlay">Play</button><button class="btn-ghost" id="plShuffle">Shuffle</button>'+(isBuilt?'':'<button class="btn-ghost" id="plDelete">Hapus</button>')+'</div></div></div>'
        +(songList.length?'<div class="song-list">'+songList.map((s,i)=>{ const active=String(s.id)===String(activeId)?' is-active':''; return '<div class="song-row'+active+'" data-song="'+s.id+'"><span class="idx">'+String(i+1).padStart(2,'0')+'</span><img src="'+esc(s.cover)+'" alt="" loading="lazy" onerror="this.src=\'assets/icons/icon-192.png\'" /><div class="s-meta"><strong>'+esc(s.title)+'</strong><span>'+esc(s.artist)+'</span></div><span class="s-album">'+esc(s.album||'')+'</span>'+(isBuilt?'<span></span>':'<button class="row-more" data-pl-remove="'+s.id+'" aria-label="Remove">✕</button>')+'<button class="row-more" data-more="'+s.id+'">⋯</button></div>';}).join('')+'</div>':'<div class="empty"><strong>Playlist kosong</strong>Tambahkan lagu dari menu ⋯</div>');
      return;
    }
    const built=PlaylistsModule.getBuiltIn(); const user=PlaylistsModule.getUser();
    el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:end"><div><h1 class="page-title">Playlists</h1><p class="page-sub">Bawaan & buatan kamu (disimpan di perangkat).</p></div><button class="btn-primary" id="plCreateBtn">+ Buat playlist</button></div>'
      +'<div class="section"><div class="section-head"><h2>Built-in</h2><span class="count">'+built.length+'</span></div><div class="playlist-grid">'+(built.length?built.map(playlistCard).join(''):'<div class="empty">Tidak ada</div>')+'</div></div>'
      +'<div class="section"><div class="section-head"><h2>Your playlists</h2><span class="count">'+user.length+'</span></div>'+(user.length?'<div class="playlist-grid">'+user.map(playlistCard).join('')+'</div>':'<div class="empty"><strong>Belum ada playlist</strong>Buat playlist pertama kamu.</div>')+'</div>';
  }
  let libTab='all';
  function renderLibrary(activeId){
    const el=$('page-library'); if(!el) return;
    const recent=getRecentlyPlayed().map(songById).filter(Boolean);
    const likedArr=liked.map(songById).filter(Boolean);
    let body=''; if(libTab==='liked') body=listOrEmpty(likedArr,activeId,'No liked songs','Tap the heart to add.');
    else if(libTab==='recent') body='<div class="album-grid" style="margin-bottom:24px">'+recent.slice(0,4).map(albumCard).join('')+'</div>'+listOrEmpty(recent,activeId,'No history','Play a song to fill your history.');
    else body=listOrEmpty(songs,activeId,'Empty','');
    const q=typeof getAudioQuality==='function'?getAudioQuality():'normal';
    el.innerHTML='<h1 class="page-title">Library</h1><p class="page-sub">All songs, liked, and recent.</p><div class="lib-tabs" role="tablist"><button class="lib-tab'+(libTab==='all'?' is-active':'')+'" data-lib="all">All</button><button class="lib-tab'+(libTab==='liked'?' is-active':'')+'" data-lib="liked">Liked · '+likedArr.length+'</button><button class="lib-tab'+(libTab==='recent'?' is-active':'')+'" data-lib="recent">Recent · '+recent.length+'</button></div>'+body
      +'<div class="section"><div class="section-head"><h2>Settings</h2></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="color:var(--muted);font-size:13px">Audio quality</span><select id="qualitySelect" style="background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 10px"><option value="saver"'+(q==='saver'?' selected':'')+'>Data saver ~96kbps</option><option value="normal"'+(q==='normal'?' selected':'')+'>Normal ~128kbps</option><option value="high"'+(q==='high'?' selected':'')+'>High ~192kbps</option></select><span style="color:var(--muted);font-size:12px">Hanya satu versi yang di-load.</span></div></div>';
  }
  function renderAll(activeId){
    renderHome(activeId); renderLiked(activeId); renderPlaylists(activeId); renderLibrary(activeId);
    const q=($('searchInput')||{}).value||''; renderSearchResults(q,activeId); markActiveSong(activeId); renderQueue();
  }
  function markActiveSong(activeId){
    document.querySelectorAll('[data-song]').forEach((el)=>{
      const id=el.getAttribute('data-song'); if(id===null) return;
      el.classList.toggle('is-active', String(id)===String(activeId));
    });
  }
  function syncPlayerLike(){
    const st=Player.getState(); const on=st.currentId!==null && isLiked(st.currentId);
    paintHeart($('pLike'),on); paintHeart($('fLike'),on);
    const m=$('mLike'); if(m) paintHeart(m,on);
    const fpCheck=$('fpCheck'); if(fpCheck) fpCheck.style.display=on?'':'none';
  }
  // Estetik full player: update bg + lyric
  function updateFullAesthetic(state){
    const s=state.current; const cover=s?s.cover:'assets/covers/song-1.jpg';
    const bg=$('fpBg'); if(bg){ try{ bg.style.backgroundImage='url('+encodeURI(cover)+')'; }catch(e){ bg.style.backgroundImage='url('+cover+')'; } }
    const lyricEl=$('fpLyric'); if(lyricEl){ lyricEl.textContent=getLyric(s); }
    const pill=$('fpPill'); if(pill){
      const now=new Date(); const hh=String(now.getHours()).padStart(2,'0'); const mm=String(now.getMinutes()).padStart(2,'0');
      pill.textContent=hh+':'+mm;
    }
    // lyric preview sheet title
    const prevTitle=$('fpPrevTitle'); if(prevTitle) prevTitle.textContent=s? s.title : 'Pratinjau lirik';
    const prevSub=$('fpPrevSub'); if(prevSub) prevSub.textContent=s? s.artist+' · '+s.album : 'Pilih lagu untuk melihat lirik';
  }
  function updateTrackUI(state){
    const s=state.current; const title=s?s.title:'Pilih lagu untuk diputar'; const artist=s?s.artist+' · '+s.album:'Risyad Player'; const cover=s?s.cover:'assets/covers/song-1.jpg';
    if($('pCover')) $('pCover').src=cover;
    if($('mCover')) $('mCover').src=cover;
    if($('fCover')) $('fCover').src=cover;
    if($('fpCardCover')) $('fpCardCover').src=cover;
    if($('pTitle')) $('pTitle').textContent=title;
    if($('mTitle')) $('mTitle').textContent=title;
    if($('fTitle')) $('fTitle').textContent=title;
    if($('fpCardTitle')) $('fpCardTitle').textContent=s?s.title:'Pilih lagu';
    if($('pArtist')) $('pArtist').textContent=artist;
    if($('mArtist')) $('mArtist').textContent=s?s.artist:'Risyad';
    if($('fArtist')) $('fArtist').textContent=s?s.artist+' · '+s.album:'Risyad';
    if($('fpCardArtist')) $('fpCardArtist').textContent=s?s.artist:'—';
    syncPlayerLike(); markActiveSong(state.currentId);
    // OPTIMASI: jangan rebuild Home penuh, hanya patch recent (hemat CPU di HP)
    patchRecent(state.currentId);
    updateFullAesthetic(state);
    renderQueue(state);
    if(selectedPlId) renderPlaylists(state.currentId);
    if('mediaSession' in navigator && s){
      try{ navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist,album:s.album,artwork:[{src:cover,sizes:'600x600',type:'image/png'}]});}catch(e){}
    }
  }
  function paintBtn(btn,playing){ if(!btn)return; btn.innerHTML=playing?ICON_PAUSE:ICON_PLAY; }
  function updateStateUI(state){
    paintBtn($('btnPlay'),state.isPlaying); paintBtn($('mPlay'),state.isPlaying); paintBtn($('fPlay'),state.isPlaying);
    [$('btnShuffle'),$('fShuffle')].forEach((b)=>{ if(b) b.classList.toggle('is-on',state.shuffle); });
    [$('btnRepeat'),$('fRepeat')].forEach((b)=>{ if(!b)return; b.classList.toggle('is-on',state.repeatMode!=='off'); b.title='Repeat: '+state.repeatMode; });
    const badge=$('repeatBadge'); if(badge) badge.textContent=state.repeatMode==='one'?'1':'';
    [$('btnMute'),$('fMute')].forEach((b)=>{ if(b) b.classList.toggle('is-on',state.muted||state.volume===0); });
    const v=Math.round((state.muted?0:state.volume)*100);
    if($('volBar')&&document.activeElement!==$('volBar')) $('volBar').value=v;
    if($('fVol')&&document.activeElement!==$('fVol')) $('fVol').value=v;
    updateQueueCount(state);
  }
  function updateProgressUI(state){
    const d=state.duration||0,c=state.currentTime||0,frac=d>0?Math.min(1,Math.max(0,c/d)):0,pos=Math.round(frac*1000);
    [['seekBar'],['fSeek'],['fpSeek']].forEach(([id])=>{ const el=$(id); if(el&&document.activeElement!==el) el.value=pos; });
    if($('curTime')) $('curTime').textContent=fmt(c);
    if($('durTime')) $('durTime').textContent=fmt(d);
    if($('fCur')) $('fCur').textContent=fmt(c);
    if($('fDur')) $('fDur').textContent=fmt(d);
    if($('fpCur')) $('fpCur').textContent=fmt(c);
    if($('fpDur')) $('fpDur').textContent=fmt(d);
    // Fix 13: pakai transform scaleX (GPU) bukan width (layout)
    const lp=$('fpLyricProgress'); if(lp) lp.style.transform='scaleX('+frac+')';
    const pp=$('fpPreviewProg'); if(pp) pp.style.transform='scaleX('+frac+')';
  }
  function updateQueueCount(state){
    const s=state||(typeof Player!=='undefined'?Player.getState():{queue:[]}); const n=(s.queue||[]).length;
    ['sideQueueCount','pQueueCount','mQueueCount','bottomQueueCount'].forEach((id)=>{ const el=$(id); if(el){ el.textContent=String(n); el.style.display=n?'':'none'; }});
    const sub=$('queueSub'); if(sub) sub.textContent=n? n+' lagu berikutnya':'Kosong — tambah dari ⋯';
  }
  function renderQueue(state){
    const st=state||(typeof Player!=='undefined'?Player.getState():null);
    const qSongs=st?st.queueSongs:(typeof QueueModule!=='undefined'?QueueModule.toSongs():[]);
    const cur=st?st.current:null;
    const nowEl=$('queueNow'); if(nowEl){
        if(cur) nowEl.innerHTML='<img src="'+esc(cur.cover)+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'assets/icons/icon-192.png\'" /><div class="q-meta"><strong>'+esc(cur.title)+'</strong><span>Sedang diputar · '+esc(cur.artist)+'</span></div>';
      else nowEl.innerHTML='<div class="q-meta"><strong>Tidak ada lagu</strong><span>Pilih lagu untuk mulai</span></div>';
    }
    const listEl=$('queueList'); if(listEl){
      if(!qSongs.length) listEl.innerHTML='<div class="empty"><strong>Queue kosong</strong>Pakai “Add to queue” atau “Play next” dari ⋯</div>';
      else listEl.innerHTML=qSongs.map((s,i)=>'<div class="q-row" data-qidx="'+i+'"><img src="'+esc(s.cover)+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'assets/icons/icon-192.png\'" /><div class="q-meta"><strong>'+esc(s.title)+'</strong><span>'+esc(s.artist)+'</span></div><button class="ctl" data-qremove="'+i+'" aria-label="Hapus">✕</button></div>').join('');
    }
    updateQueueCount(st);
  }
  // Timer UI
  function updateTimerUI(state){
    const btn=$('fTimer'); const badge=$('timerBadge');
    const s=state|| (typeof SleepTimer!=='undefined'?SleepTimer.getState():null);
    if(!s||!btn) return;
    if(s.active){
      btn.classList.add('is-on');
      if(badge){ badge.textContent=s.mins+'m'; badge.style.display=''; }
      btn.title='Sleep '+SleepTimer.fmtRemain();
    } else {
      btn.classList.remove('is-on');
      if(badge) badge.style.display='none';
      btn.title='Sleep timer';
    }
  }
  function openCreateModal(){ $('modalCreate').classList.remove('hidden'); $('modalCreate').setAttribute('aria-hidden','false'); setTimeout(()=>$('createName').focus(),30); }
  function closeCreateModal(){ $('modalCreate').classList.add('hidden'); $('modalCreate').setAttribute('aria-hidden','true'); $('createName').value=''; }
  // Fix 15: semua innerHTML pakai esc() — sudah, lyric pakai textContent aman
  function openAddToPlModal(songId){
    pendingSongId=songId; const song=songById(songId); $('addToPlSongName').textContent=song?song.title+' — '+song.artist:'';
    const user=PlaylistsModule.getUser(); const listEl=$('addToPlList');
    if(!user.length) listEl.innerHTML='<div class="empty"><strong>Belum ada playlist</strong>Buat playlist dulu.</div>';
    else listEl.innerHTML=user.map((pl)=>{ const has=pl.songIds.some((x)=>String(x)===String(songId)); return '<button class="pl-pick" data-pl-add="'+esc(pl.id)+'">'+esc(pl.name)+' · '+esc(String(pl.songIds.length))+' lagu'+(has?' ✓ sudah ada':'')+'</button>'; }).join('');
    $('modalAddToPl').classList.remove('hidden'); $('modalAddToPl').setAttribute('aria-hidden','false');
  }
  function closeAddToPlModal(){ $('modalAddToPl').classList.add('hidden'); $('modalAddToPl').setAttribute('aria-hidden','true'); }
  function openSongMenu(songId){
    pendingSongId=songId; const s=songById(songId); if(!s)return;
    $('songMenuTitle').textContent=s.title; $('songMenuSub').textContent=s.artist+' · '+s.album;
    $('modalSongMenu').classList.remove('hidden'); $('modalSongMenu').setAttribute('aria-hidden','false');
  }
  function closeSongMenu(){ $('modalSongMenu').classList.add('hidden'); $('modalSongMenu').setAttribute('aria-hidden','true'); }
  function openQueueDrawer(){ $('queueDrawer').classList.add('open'); $('queueDrawer').setAttribute('aria-hidden','false'); $('queueBackdrop').classList.remove('hidden'); renderQueue(); }
  function closeQueueDrawer(){ $('queueDrawer').classList.remove('open'); $('queueDrawer').setAttribute('aria-hidden','true'); $('queueBackdrop').classList.add('hidden'); }
  function openTimerModal(){ $('modalTimer').classList.remove('hidden'); $('modalTimer').setAttribute('aria-hidden','false'); }
  function closeTimerModal(){ $('modalTimer').classList.add('hidden'); $('modalTimer').setAttribute('aria-hidden','true'); }
  function initLikes(){ liked=getLikedSongs(); }
  return {
    esc,fmt,toast,greeting,
    renderHome,renderSearchResults,renderLiked,renderPlaylists,renderLibrary,renderAll,renderQueue,updateQueueCount,updateTimerUI,
    updateTrackUI,updateStateUI,updateProgressUI,
    toggleLike,isLiked,refreshLikeButtons,markActiveSong,patchRecent,
    openCreateModal,closeCreateModal,openAddToPlModal,closeAddToPlModal,openSongMenu,closeSongMenu,openQueueDrawer,closeQueueDrawer,openTimerModal,closeTimerModal,
    initLikes,
    setLibTab(t){ libTab=t; },
    get liked(){ return liked; },
    get selectedPlId(){ return selectedPlId; },
    setSelectedPlId(v){ selectedPlId=v; },
    get pendingSongId(){ return pendingSongId; },
    setPendingSongId(v){ pendingSongId=v; }
  };
})();
