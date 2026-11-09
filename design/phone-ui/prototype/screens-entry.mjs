// mothership:dev-only
//
// A–E: the intro, the main menu, Host, Join, Recover and character selection.

import { h, ic, pt, button, iconButton, topBar, row, list, groupLabel, groupNote, field, codeBoxes, errorNote, cell, toast, pill } from './ui.mjs';
import { filmFrame, SIGN } from './art.mjs';
import { SELF, ROOM_CODE, seatOf } from './fixtures.mjs';

const navBar = (title, back = 's=menu', backLabel = 'Menu') => h('div.nav-bar',
  h('button.btn.btn-plain', { type: 'button', 'data-go': back, 'data-tx': 'push' }, ic('chevronLeft'), h('span', backLabel)),
  h('h1', title), h('span.spacer'));

function brandHero(t = 2000) {
  return h('div.menu-hero', { 'aria-hidden': 'true' }, filmFrame({ film: 'brand', t }));
}

export const ENTRY_SCREENS = {
  // A. The two-second intro, unchanged: the reviewed brand film.
  intro: Object.assign((root, p) => {
    root.append(filmFrame({ film: 'brand', t: Number(p.t ?? 1200), variant: p.motion === 'reduced' ? 'reduced' : 'full', play: !!p.live }));
    root.append(h('p.vh', { role: 'status' }, 'Game N by Plan B'));
  }, { auto: () => ({ after: 2000, go: 's=menu' }) }),

  menu(root, p) {
    root.append(brandHero(1650));
    root.append(h('div.menu-settings', iconButton('settings', 'Display settings', { go: 's=settings&from=menu' })));
    const state = p.state ?? 'default';
    const off = state === 'offline' ? 'true' : null;
    root.append(h('div.menu-actions',
      state === 'offline' ? h('p.error', { role: 'alert' }, ic('offline'), h('span', 'No connection. Join, Host and Recover return when you are back online.')) : null,
      h('button.entry', { type: 'button', 'data-tone': 'primary', 'data-go': 's=join', 'data-tx': 'push', 'aria-disabled': off },
        h('span.entry-icon', ic('join', { filled: true })), h('span', h('b', 'Join'), h('small', 'Enter a room code')), h('span.row-chev', ic('chevronRight'))),
      h('button.entry', { type: 'button', 'data-go': 's=host-setup', 'data-tx': 'push', 'aria-disabled': off },
        h('span.entry-icon', ic('host', { filled: true })), h('span', h('b', 'Host'), h('small', 'Open a room for 7–9 players')), h('span.row-chev', ic('chevronRight'))),
      h('button.btn.btn-plain.entry-plain', { type: 'button', 'data-go': 's=recover', 'data-tx': 'push', 'aria-disabled': off }, ic('key', { filled: true }), h('span', 'Recover my seat'))));
  },

  // B. Host setup: only what the room needs before it exists.
  'host-setup'(root, p) {
    const count = Number(p.count ?? 9);
    root.append(h('div.screen', navBar('Host'),
      h('h2.large-title', 'New room'),
      groupLabel('Players'),
      h('div.seg', { role: 'radiogroup', 'aria-label': 'Players' }, [7, 8, 9].map(n => h('button', { type: 'button', role: 'radio', 'aria-checked': String(n === count), 'data-go': `s=host-setup&count=${n}` }, String(n)))),
      groupNote(count === 7 ? '4 Blue · 2 Red · 1 Alien' : count === 8 ? '4 Blue · 3 Red · 1 Alien' : '5 Blue · 3 Red · 1 Alien'),
      groupLabel('After the room opens'),
      list(row({ icon: 'join', tint: 'paper', title: 'Players ask to join', sub: 'You admit each one', tag: 'div' }),
        row({ icon: 'bot', tint: 'steel', title: 'Bots fill empty seats', sub: 'Set them in the lobby', tag: 'div' })),
      h('div.screen-foot', button(p.state === 'creating' ? 'Opening…' : 'Open room', { block: true, busy: p.state === 'creating', go: 's=host-lobby&state=waiting', icon: 'host' }))));
  },

  'host-lobby'(root, p) {
    const state = p.state ?? 'waiting';
    const humans = state === 'full' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const bots = state === 'full' ? 3 : 0;
    const filled = humans.length + bots;
    const requests = state === 'requests' ? [{ name: 'Gus', kind: 'phone' }, { name: 'Table', kind: 'display' }] : [];
    const people = humans.map(seatOf);
    root.append(h('div.screen', navBar('Lobby', 's=menu', 'Leave'),
      h('div.code-card',
        h('div.code-label', 'Room code'),
        h('div.code-row', h('span.code', { 'aria-label': `Room code ${ROOM_CODE.split('').join(' ')}` }, ROOM_CODE),
          button(state === 'copied' ? 'Copied' : 'Copy', { kind: 'tinted', small: true, icon: state === 'copied' ? 'check' : 'copy', go: 's=host-lobby&state=copied', aria: 'Copy room code' })),
        h('div.meta', h('span', `${filled} of 9 seats`), h('span.progress', h('i', { style: { width: `${(filled / 9) * 100}%` } })))),
      requests.length ? [groupLabel(`Asking to join · ${requests.length}`), list(requests.map(r => row({ tag: 'div', lead: h('span.row-icon', { 'data-tint': r.kind === 'display' ? 'slate' : 'paper' }, ic(r.kind === 'display' ? 'display' : 'phone', { filled: true })), title: r.name, sub: r.kind === 'display' ? 'Shared display' : 'Player phone', trail: button('Admit', { kind: 'primary', small: true, go: 's=host-lobby&state=waiting' }) })))] : null,
      groupLabel('Seats'),
      list(...people.map(m => row({ tag: 'div', lead: h('b.num', String(m.seat)), title: m.name, sub: m.seat === 1 ? 'Host' : null })),
        ...Array.from({ length: bots }, (_, i) => row({ tag: 'div', lead: h('b.num', String(people.length + i + 1)), title: `Bot ${people.length + i + 1}`, sub: 'Bot', trail: h('span.row-icon', { 'data-tint': 'steel' }, ic('bot', { filled: true })) }))),
      groupLabel('Bots'),
      list(row({ tag: 'div', icon: 'bot', tint: 'steel', title: 'Bots', sub: `Up to ${9 - humans.length}`, trail: h('span.stepper', h('button', { type: 'button', 'aria-label': 'Fewer bots', 'aria-disabled': bots === 0 ? 'true' : null }, ic('minus')), h('output', String(bots)), h('button', { type: 'button', 'aria-label': 'More bots', 'data-go': 's=host-lobby&state=full' }, ic('plus'))) })),
      h('div.screen-foot',
        button('Start character selection', { block: true, disabled: filled < 9, go: 's=choose&state=open', icon: 'pass' }),
        filled < 9 ? h('p.group-note', { style: { textAlign: 'center' } }, `${9 - filled} more ${9 - filled === 1 ? 'seat' : 'seats'} to fill`) : null)));
    if (state === 'copied') root.append(toast('Copied'));
  },

  // C. Join.
  join(root, p) {
    const state = p.state ?? 'empty';
    const code = state === 'empty' ? 'K7' : ROOM_CODE;
    const errors = {
      'no-room': 'No room has this code. Check it with the host.',
      started: 'This room has already started.',
      busy: 'Too many requests right now. Try again in a moment.',
    };
    const nameInvalid = state === 'name';
    root.append(h('div.screen', navBar('Join', 's=menu'),
      h('h2.large-title', 'Join a room'),
      h('div.field', h('span', 'Room code'),
        codeBoxes(code, { focusAt: state === 'empty' ? 2 : null, invalid: ['no-room', 'started'].includes(state) }),
        errors[state] && state !== 'busy' ? errorNote(errors[state]) : null),
      field('Your name', { value: state === 'empty' ? '' : nameInvalid ? 'Devendra Kumar' : 'Dev', placeholder: '1–12 characters', count: state === 'empty' ? '0/12' : nameInvalid ? '14/12' : '3/12', invalid: nameInvalid, focus: nameInvalid }),
      nameInvalid ? errorNote('Use 1–12 characters.') : null,
      groupLabel('This device'),
      h('div.seg', { role: 'radiogroup', 'aria-label': 'This device' },
        h('button', { type: 'button', role: 'radio', 'aria-checked': 'true' }, ic('phone', { filled: true }), 'Player phone'),
        h('button', { type: 'button', role: 'radio', 'aria-checked': 'false' }, ic('display'), 'Shared display')),
      state === 'busy' ? errorNote(errors.busy) : null,
      h('div.screen-foot', button(state === 'sending' ? 'Sending…' : 'Ask to join', { block: true, disabled: state === 'empty' || nameInvalid, busy: state === 'sending', go: 's=join-wait&state=pending', icon: 'join' }))));
  },

  'join-wait'(root, p) {
    const state = p.state ?? 'pending';
    if (state === 'closed') {
      root.append(h('div.screen', navBar('Join', 's=menu'), h('div.wait',
        h('span.big-icon', ic('lock', { filled: true })), h('h2', 'This room started without you'), h('p', `Room ${ROOM_CODE}`)),
        h('div.screen-foot', button('Back to menu', { block: true, kind: 'secondary', go: 's=menu' }))));
      return;
    }
    if (state === 'admitted') {
      const people = [1, 2, 3, 4, 5].map(seatOf);
      root.append(h('div.screen', navBar('Lobby', 's=menu', 'Leave'),
        h('div.wait', { style: { paddingTop: '6px' } }, h('span.seat-badge', h('b.num', String(SELF)), 'You’re in · Seat 4'), h('p', `Room ${ROOM_CODE} · waiting for the host`)),
        groupLabel(`Players · ${people.length} of 9`),
        list(people.map(m => row({ tag: 'div', lead: h('b.num', String(m.seat)), title: m.seat === SELF ? `${m.name} (you)` : m.name }))),
        h('div.screen-foot', h('p.group-note', { style: { textAlign: 'center' } }, h('span.spinner', { 'aria-hidden': 'true' }), ' Character selection starts when every seat is filled'))));
      return;
    }
    root.append(h('div.screen', navBar('Join', 's=menu', 'Cancel'), h('div.wait',
      h('span.big-icon', ic('hourglass', { filled: true })), h('h2', 'Waiting for the host'), h('p', `Room ${ROOM_CODE} · as Dev`),
      button('Check again', { kind: 'plain', go: 's=join-wait&state=admitted' }))));
  },

  // D. Recover.
  recover(root, p) {
    const state = p.state ?? 'entry';
    if (state === 'success') {
      root.append(h('div.screen', navBar('Recover', 's=menu'), h('div.wait',
        h('span.big-icon', ic('check')), h('h2', 'Seat 4 is yours again'), h('p', 'Back to the match where it is now')),
        h('div.screen-foot', button('Continue', { block: true, go: 's=room&room=room-a&state=reconnecting' }))));
      return;
    }
    root.append(h('div.screen', navBar('Recover', 's=menu'),
      h('h2.large-title', 'Recover your seat'),
      field('Match ID', { value: state === 'entry' ? '' : 'mtch-8f2c4e', placeholder: 'From the host', mono: true, focus: state === 'entry' }),
      field('Recovery code', { value: state === 'entry' ? '' : 'x'.repeat(32), placeholder: '32 characters', secret: true, invalid: state === 'refused' }),
      state === 'refused' ? errorNote('That code was not accepted. A code works once, for 15 minutes. Ask the host for a new one.') : null,
      groupNote('The host makes a code for your seat in Host controls. It is never shown on the shared display.'),
      h('div.screen-foot', button(state === 'sending' ? 'Checking…' : 'Recover seat', { block: true, disabled: state === 'entry', busy: state === 'sending', go: 's=recover&state=success', icon: 'key' }))));
  },

  // E. Character selection: one screen, a 3 × 3 grid of all nine.
  choose(root, p) {
    const state = p.state ?? 'open';
    const seconds = Number(p.seconds ?? (state === 'closing' ? 4 : state === 'auto' ? 0 : 21));
    const mine = { open: null, selected: 'c6', confirmed: 'c6', closing: 'c6', auto: 'c7' }[state] ?? null;
    const takenNow = state === 'open' ? { c4: 2, c8: 1 } : { c4: 2, c8: 1, c3: 5, c9: 6, c2: 8 };
    root.append(topBar({ kind: 'phase', icon: 'players', title: 'Choose a character', sub: state === 'auto' ? 'Time is up' : 'Assigned for you if time runs out', seconds, urgentAt: 5 }));
    const order = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
    const grid = h('div.grid9.choose-grid', { role: 'group', 'aria-label': 'Characters' }, order.map(id => {
      const owner = takenNow[id];
      const isMine = id === mine;
      const cst = isMine ? (state === 'selected' ? 'selected' : 'confirmed') : owner || state === 'auto' ? 'taken' : 'available';
      const node = cell({ seat: 0, name: SIGN[id], character: id }, {
        state: cst,
        note: isMine ? (state === 'selected' ? 'Saving…' : state === 'auto' ? 'Assigned' : 'Yours') : owner ? `Taken · ${owner}` : '',
        mark: isMine && cst === 'confirmed' ? 'check' : null,
        label: `${SIGN[id]}${owner ? `, taken by player ${owner}` : isMine ? ', yours' : ''}`,
        go: cst === 'available' ? 's=choose&state=selected' : null,
      });
      node.querySelector('.cell-name .num')?.remove();
      return node;
    }));
    const foot = mine
      ? h('div.choose-foot', pt(mine, 52), h('div.who', h('b', SIGN[mine]), h('span', state === 'selected' ? [h('span.spinner', { 'aria-hidden': 'true' }), ' Saving your choice'] : state === 'auto' ? 'Assigned automatically' : 'Tap another to change')), ['confirmed', 'closing'].includes(state) ? pill('Yours', { icon: 'check', tone: 'amber' }) : null)
      : h('div.choose-foot', h('span.pt.pt-empty', { style: { width: '52px', height: '52px' } }, ic('players')), h('div.who', h('b', 'No character yet'), h('span', 'Tap one to choose')));
    root.append(h('div.screen', { style: { paddingTop: 'calc(var(--top) + 12px)' } }, grid, foot));
    if (state === 'auto') root.append(toast('Assigned: Juno', 'info'));
  },
};
