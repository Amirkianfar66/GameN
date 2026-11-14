// mothership:dev-only
//
// F–G: the private role stage (exactly 30 seconds: the card for 20, the role's film for 10) and the
// shared boarding (10 seconds) into Round 1. The films are the reviewed pre-game films, unchanged.

import { h, ic, pt, button, iconButton, topBar, toast, stamp, pill } from './ui.mjs';
import { filmFrame, FILM_ROLE, cardUrl, deviceUrl } from './art.mjs';
import { SELF, ROLE_FIXTURES, seatOf } from './fixtures.mjs';
import { game } from './screens.mjs';

export const STAGE_MS = 30000;
export const CARD_MS = 20000;

/** The private role card: the player's own character with the role's device, its name, team and two facts. */
export function roleCard(role = 'Doctor', { character = seatOf(SELF).character, art = 'ok' } = {}) {
  const fx = ROLE_FIXTURES[role];
  const team = fx.team.toLowerCase();
  const device = deviceUrl(role);
  const artBox = art === 'missing'
    ? h('div.rc-art', h('div.rc-missing', ic('card'), h('span', 'Picture unavailable'), h('span', { style: { fontWeight: 500 } }, 'Your role is below')))
    : h('div.rc-art', h('img.rc-person', { src: cardUrl(character), alt: '' }),
      device ? h('img.rc-device', { src: device, alt: '' }) : role === 'Engineer' ? h('span.rc-device', { style: { width: '44%', aspectRatio: '1', backgroundImage: 'var(--sw-asset-sw-device-engineer)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } }) : null);
  return h('article.rolecard', { 'data-team': team, 'data-art': art === 'missing' ? 'missing' : null, 'aria-label': `Your role: ${role}, ${fx.team} team` },
    artBox, h('h2.rc-name', role), h('p.rc-team', h('i', { 'aria-hidden': 'true' }), `${fx.team} team`),
    h('ul.rc-facts', fx.facts.map(f => h('li', f))));
}

/** The 30-second stage's progress: the card's 20 seconds, then the film's 10, then Ready. */
function stageStrip(t) {
  const pc = Math.min(1, t / CARD_MS), pf = Math.max(0, Math.min(1, (t - CARD_MS) / (STAGE_MS - CARD_MS)));
  return h('div', { role: 'progressbar', 'aria-label': 'Role stage', 'aria-valuemin': '0', 'aria-valuemax': '30', 'aria-valuenow': String(Math.min(30, Math.floor(t / 1000))),
    style: { position: 'absolute', left: '16px', right: '16px', top: 'calc(var(--top) + 6px)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4px', zIndex: 31 } },
  h('span.progress', { style: { height: '4px' } }, h('i', { style: { width: `${pc * 100}%`, background: 'var(--paper)' } })),
  h('span.progress', { style: { height: '4px' } }, h('i', { style: { width: `${pf * 100}%` } })));
}

export const PREGAME_SCREENS = {
  /**
   * F. The private role stage. t: ms since the stage started (server time). state: normal | concealed |
   * reduced | missing | late | ready | waiting. Ready stays the player's own choice at 30 s.
   */
  role: Object.assign((root, p) => {
    const role = p.role ?? 'Doctor';
    const t = Number(p.t ?? 4000);
    const state = p.state ?? 'normal';
    const me = seatOf(SELF);
    const left = Math.max(0, (STAGE_MS - t) / 1000);
    const film = t >= CARD_MS && t < STAGE_MS && !['concealed', 'missing', 'skipped'].includes(state);
    if (film) {
      root.append(filmFrame({ film: 'role', role: FILM_ROLE[role], character: me.character, seat: SELF, t: t - CARD_MS, variant: state === 'reduced' || p.motion === 'reduced' ? 'reduced' : 'full', play: !!p.live }));
      root.append(h('div', { style: { position: 'absolute', top: 'calc(var(--safe-t) + 8px)', right: '12px', zIndex: 30 } },
        h('span.timer', { role: 'timer', 'aria-label': `Role stage, ${Math.ceil(left)} seconds left` }, ic('timer'), h('span', `0:${String(Math.ceil(left)).padStart(2, '0')}`))));
      root.append(h('div.film-skip', button('Skip film', { kind: 'secondary', small: true, icon: 'skip', go: `s=role&role=${encodeURIComponent(role)}&t=${t}&state=skipped` })));
      if (state === 'late') root.append(toast('Rejoined · the stage carried on', 'info'));
      return;
    }
    root.append(topBar({ kind: 'phase', icon: 'card', title: 'Your role', sub: 'Only on this phone', seconds: t >= STAGE_MS ? null : left, urgentAt: -1 }));
    if (t < STAGE_MS) root.append(stageStrip(t));
    const area = h('div.card-area');
    if (state === 'concealed') area.append(h('div.cardback', ic('hide'), h('p', 'Role hidden'), button('Show role', { kind: 'secondary', small: true, icon: 'show', go: `s=role&role=${encodeURIComponent(role)}&t=${t}` })));
    else area.append(roleCard(role, { character: me.character, art: state === 'missing' ? 'missing' : 'ok' }));
    const foot = h('div.stage-foot');
    // The card and its foot: one column at larger text, so the foot never covers the card (screens.css .stage-body).
    root.append(h('div.stage-body', area, foot));
    if (t < STAGE_MS) {
      foot.append(h('p.note', state === 'missing' ? 'Film unavailable · your card stays up until Ready' : state === 'skipped' ? 'Film skipped on this phone · the stage keeps time' : t < CARD_MS ? `Your film starts in 0:${String(Math.ceil((CARD_MS - t) / 1000)).padStart(2, '0')}` : 'Ready opens at 0:30'));
      foot.append(button('Ready', { block: true, disabled: true, icon: 'check' }));
    } else if (state === 'waiting') {
      foot.append(h('p.note', '6 of 9 ready'), button('Ready', { block: true, kind: 'secondary', disabled: true, icon: 'check' }));
    } else {
      foot.append(h('p.note', 'Hide your phone, then tap Ready'), button('Ready', { block: true, icon: 'check', go: `s=role&role=${encodeURIComponent(role)}&t=${t}&state=waiting` }));
    }
    root.append(h('div', { style: { position: 'absolute', top: 'calc(var(--safe-t) + 4px)', right: '6px', zIndex: 41 } }));
    if (state === 'late') root.append(toast('Rejoined · the stage carried on', 'info'));
    if (state === 'waiting') root.append(h('div', { style: { position: 'absolute', left: 0, right: 0, top: 'calc(var(--top) + 18px)', textAlign: 'center', zIndex: 32 } }, pill('Ready', { icon: 'check', tone: 'accent' })));
  }, { auto: p => { const t = Number(p.t ?? 4000); return t < CARD_MS ? { after: CARD_MS - t, go: `s=role&role=${encodeURIComponent(p.role ?? 'Doctor')}&t=${CARD_MS}`, tx: 'fade' } : t < STAGE_MS && p.state !== 'skipped' ? { after: STAGE_MS - t, go: `s=role&role=${encodeURIComponent(p.role ?? 'Doctor')}&t=${STAGE_MS}`, tx: 'fade' } : null; } }),

  /** G. Boarding: the shared ten-second film. Skip hides the picture on this phone only. */
  boarding: Object.assign((root, p) => {
    const t = Number(p.t ?? 1500);
    const state = p.state ?? 'film';
    const left = Math.max(0, (10000 - t) / 1000);
    if (state === 'film' && t < 10000) {
      root.append(filmFrame({ film: 'boarding', roster: 9, t, variant: p.motion === 'reduced' ? 'reduced' : 'full', play: !!p.live }));
      root.append(h('div.film-skip', button('Skip', { kind: 'secondary', small: true, icon: 'skip', go: `s=boarding&t=${t}&state=skipped` })));
      return;
    }
    root.append(h('div.screen', { style: { justifyContent: 'center' } }, h('div.wait',
      h('span.big-icon', ic(state === 'waiting' ? 'hourglass' : 'flag', { filled: true })),
      h('h2', state === 'waiting' ? 'Starting Round 1' : 'Boarding'),
      state === 'waiting' ? h('p', h('span.spinner', { 'aria-hidden': 'true' }), ' Waiting for the ship') : h('p', { role: 'timer' }, `Round 1 in 0:${String(Math.ceil(left)).padStart(2, '0')}`))));
  }, { auto: p => (p.state ?? 'film') === 'film' && Number(p.t ?? 1500) < 10000 ? { after: 10000 - Number(p.t ?? 1500), go: 's=room&room=room-a&stamp=round1', tx: 'zoom' } : null }),
};
