import { createKit } from '../../../../design/phone-ui/components/kit/kit.mjs';
import './lobby-music.css';

// Keep the preference from the owner's version 6 playtest.
const preferenceKey = 'mothership:playtest:lobby-music';
const screens = new Set(['menu', 'display', 'host-setup', 'host-lobby', 'join', 'join-wait', 'recover']);

export function mountLobbyMusic(root, session, soundtrack, { autoplay }) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const audio = doc.createElement('audio');
  audio.loop = true;
  audio.preload = 'none';
  audio.hidden = true;
  audio.dataset.lobbyMusic = 'cold-wake';

  const button = createKit(doc).iconButton({ label: 'Lobby music' });
  button.dataset.lobbyMusicControl = '';
  button.insertAdjacentHTML('beforeend', `<svg aria-hidden="true" focusable="false" class="ms-k-ic" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 5.8 20 3.4v12.1c0 1.6-1.5 2.8-3.4 2.8-1.5 0-2.6-.9-2.6-2.1 0-1.6 1.5-2.8 3.4-2.8.3 0 .5 0 .8.1V7.1l-7.4 1.6v9.1c0 1.6-1.5 2.8-3.4 2.8-1.5 0-2.6-.9-2.6-2.1 0-1.6 1.5-2.8 3.4-2.8.3 0 .5 0 .8.1z"/>
    <path class="lobby-music-slash" d="m3 3 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`);
  let enabled = true;
  try { enabled = win.localStorage.getItem(preferenceKey) !== 'off'; } catch { /* Tab-local preference. */ }
  button.setAttribute('aria-pressed', String(enabled));

  let playback = autoplay ? 'initial' : 'waiting';
  let attempt = 0;
  let boundMatch = null;
  let disposed = false;

  function lobby() {
    const model = session.getModel();
    const atEntry = model.status === null && (model.matchId === null || model.pendingAdmission);
    if (disposed || model.connection !== 'live' || model.uncertain || !root.isConnected
        || doc.visibilityState !== 'visible' || !doc.hasFocus() || root.closest('[hidden],[inert]')) return null;
    return atEntry || model.status === 'lobby' ? model : null;
  }

  function stop() {
    ++attempt;
    playback = 'waiting';
    boundMatch = null;
    if (!audio.hasAttribute('src')) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.remove();
  }

  function play(fromGesture = false) {
    const model = lobby();
    if (!enabled || !button.isConnected || !model) return;
    if (playback === 'playing' || (!fromGesture && playback !== 'initial')) return;
    if (playback === 'starting' && !audio.paused) return;
    const request = ++attempt;
    playback = 'starting';
    boundMatch = model.matchId;
    if (!audio.hasAttribute('src')) {
      audio.src = soundtrack;
      doc.body.append(audio);
    }
    audio.play().then(() => {
      if (request === attempt) playback = 'playing';
    }).catch(() => { if (request === attempt) stop(); });
  }

  function setEnabled(next) {
    enabled = next;
    button.setAttribute('aria-pressed', String(enabled));
    if (!enabled) stop();
  }

  button.addEventListener('click', () => {
    setEnabled(!enabled);
    try { win.localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch { /* Tab-local preference. */ }
    if (enabled) play(true);
  });
  function onStorage(event) {
    if (event.key === preferenceKey) setEnabled(event.newValue !== 'off');
  }

  // Capture the gesture and let Host, Join and Settings receive it as usual.
  // A tap on the note itself toggles the user preference.
  function resumeOnGesture(event) {
    if (!event.isTrusted || button.contains(event.target)) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    play(true);
  }
  const onVisibility = () => { if (doc.visibilityState !== 'visible') stop(); };
  const onError = () => { if (audio.error && audio.hasAttribute('src')) stop(); };
  const onPause = () => { if (audio.paused && playback === 'playing') stop(); };
  doc.addEventListener('touchend', resumeOnGesture, { capture: true, passive: true });
  doc.addEventListener('click', resumeOnGesture, true);
  doc.addEventListener('keydown', resumeOnGesture, true);
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('blur', stop);
  win.addEventListener('pagehide', stop);
  win.addEventListener('storage', onStorage);
  audio.addEventListener('error', onError);
  audio.addEventListener('pause', onPause);

  return {
    sync() {
      const model = lobby();
      if (audio.hasAttribute('src')) {
        if (!model || (boundMatch && model.matchId !== boundMatch)) stop();
        else if (model.matchId) boundMatch = model.matchId;
      }
      const page = root.querySelector('.planet-pregame-host');
      const screen = page?.dataset.screen;
      const slot = model && screens.has(screen) && page.querySelector(screen === 'menu' ? '.ms-mm-settings' : '.ms-ep-nav-spacer');
      if (!slot) {
        button.remove();
        return;
      }
      if (button.parentNode !== slot) slot.prepend(button);
      if (playback === 'initial') play();
    },
    dispose() {
      disposed = true;
      stop();
      button.remove();
      doc.removeEventListener('touchend', resumeOnGesture, true);
      doc.removeEventListener('click', resumeOnGesture, true);
      doc.removeEventListener('keydown', resumeOnGesture, true);
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('blur', stop);
      win.removeEventListener('pagehide', stop);
      win.removeEventListener('storage', onStorage);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
    },
  };
}
