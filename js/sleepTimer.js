/* Risyad Music — sleepTimer.js
 * Sleep timer hemat baterai: 1x setTimeout + 1x setInterval untuk countdown UI.
 * Tidak menyimpan di localStorage (volatile), tidak boros.
 */
const SleepTimer = (function () {
  let timeoutId = null;
  let intervalId = null;
  let endAt = 0;
  let durationMin = 0;
  const listeners = [];

  function on(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function emit(state) { listeners.forEach((fn) => { try { fn(state); } catch (e) {} }); }
  function getState() {
    const remain = Math.max(0, endAt - Date.now());
    const mins = Math.ceil(remain / 60000);
    return { active: !!endAt && remain > 0, durationMin, remain, mins, endAt };
  }
  let _visHandler = null;
  function clear() {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    if (_visHandler) { try{ document.removeEventListener('visibilitychange', _visHandler);}catch(e){} _visHandler=null; }
    timeoutId = null; intervalId = null; endAt = 0; durationMin = 0;
    emit(getState());
  }
  function set(minutes) {
    clear();
    const m = Number(minutes);
    if (!m || m <= 0) { // 0 = off
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Sleep timer off');
      return getState();
    }
    durationMin = m;
    endAt = Date.now() + m * 60 * 1000;
    // tick UI tiap detik — hemat batre: pause saat tab hidden (fix 11)
    let _wasHidden = false;
    const tick = () => {
      const s = getState();
      emit(s);
      if (!s.active) { clearInterval(intervalId); intervalId=null; }
    };
    intervalId = setInterval(tick, 1000);
    _visHandler = () => {
      if (document.hidden) { if(intervalId){ clearInterval(intervalId); intervalId=null; _wasHidden=true; } }
      else if(_wasHidden){ _wasHidden=false; intervalId=setInterval(tick,1000); }
    };
    document.addEventListener('visibilitychange', _visHandler);
    timeoutId = setTimeout(() => {
      // auto pause
      if (typeof Player !== 'undefined') Player.pause();
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Waktu habis — pemutaran dijeda');
      clear();
    }, m * 60 * 1000);
    emit(getState());
    if (typeof UI !== 'undefined' && UI.toast) UI.toast('Sleep timer ' + m + ' menit');
    return getState();
  }
  function fmtRemain() {
    const s = getState();
    if (!s.active) return '';
    const sec = Math.floor(s.remain / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return mm + ':' + ss;
  }
  return { set, clear, getState, on, fmtRemain };
})();
