// mothership:dev-only
//
// The main menu's lifecycle probe: it drives the real component (../main-menu.mjs) in the browser, under
// whatever headers serve the page (design/tools/main-menu-check.mjs serves the production ones), and reports
// what it saw. Each check is one behaviour Frontend relies on:
//   mount     the parts and the pack's words; the hero element stays for the menu's life
//   taps      each choice reports its tap once, and only that; a tap elsewhere reports nothing
//   offline   the note above Join, an alert with the plain offline icon; the three choices refused with
//             Frontend's reason, Join and Host keeping their look and Recover dimmed, as sheet 10 draws them;
//             the settings button still takes its tap
//   online    back online, the note leaves and the same choices take taps again
//   busy      a busy choice is refused and says so
//   refused   not interactive: every control refused, nothing dimmed
//   focus     a focused choice keeps its element and the focus through updates
//   insets    Frontend's safe areas, or the browser's, place the settings button and the choices
//   layout    the size, the safe areas and the hero (the top 58 %), reported on mount and on a change of size
//   text      with larger text the choices grow from the foot up, clear of the settings button, and the canvas
//             covers the hero from 24 px above them, so nothing of theirs sits on its words; none at the Standard text;
//             the brand words go whole or not at all: where that top would cut them, the cover starts 24 px above them
//   words     brandWordsBox holds the held frame's drawn ink to half a pixel, at both sizes
//   input     malformed input is refused
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own: nothing animates (with the device's Reduce motion too)
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { brandWordsBox, COVER_LEAD_PX, mountMainMenu, MENU_WORDS, nextMainMenuInput, MAIN_MENU_DEFAULTS } from '../main-menu.mjs';
import { iconSvg } from '../../icons.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

/**
 * Where the cover starts (px from the hero's top), or null for none: COVER_LEAD_PX above the choices when they reach
 * into the hero, or COVER_LEAD_PX above the brand words when that would cut them (the Lead's review of #278).
 */
export function coverFor(stackTop, hero, words) {
  if (stackTop >= hero) return null;
  const top = stackTop - COVER_LEAD_PX;
  return top > words.top - COVER_LEAD_PX && top < words.bottom ? words.top - COVER_LEAD_PX : top;
}
/** The words are whole: above the cover's top, or under its opaque part (COVER_LEAD_PX below its top). */
export const wordsWhole = (coverTop, ink) => coverTop === null || ink.bottom <= coverTop + 0.05 || ink.top >= coverTop + COVER_LEAD_PX - 0.05;

export async function runMainMenuProbe({ sizes, offline, drawHero, heroInk }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const size = sizes['390x844'];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  document.body.append(frame);
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  /** A menu with every callback recorded. */
  const mount = (input = { insets: size.insets }) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const menu = mountMainMenu(frame, input, Object.fromEntries(['onJoin', 'onHost', 'onRecover', 'onSettings', 'onLayout'].map(n => [n, record(n)])));
    const q = s => menu.element.querySelector(s);
    return { menu, calls, root: menu.element, q, join: q('.ms-ep-entry[data-tone="primary"]'), host: q('.ms-ep-entry:not([data-tone])'), recover: q('.ms-mm-recover'), settings: q('.ms-mm-settings .ms-k-icon-btn') };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const taps = calls => calls.filter(c => c[0] !== 'onLayout').map(c => c[0]);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const opacity = node => getComputedStyle(node).opacity;
  const rel = (s, node) => { const f = s.root.getBoundingClientRect(), r = node.getBoundingClientRect(); return { top: r.top - f.top, bottom: f.bottom - r.bottom, height: r.height }; };

  if (mode === 'full') {
    await check('mount: the parts and the pack’s words; the hero element stays for the menu’s life', async () => {
      const s = mount();
      drawHero(s.menu.hero);
      const hero = s.menu.hero;
      for (let i = 0; i < 4; i += 1) s.menu.update(i % 2 ? { notice: null } : offline);
      const seen = {
        root: s.root.className, name: s.root.getAttribute('aria-label'),
        join: s.join?.innerText.replace(/\s+/g, ' ').trim(), host: s.host?.innerText.replace(/\s+/g, ' ').trim(), recover: s.recover?.textContent.trim(),
        settings: s.settings?.getAttribute('aria-label'), heroSame: s.menu.hero === hero && s.root.contains(hero) && hero.childElementCount > 0,
        heroHidden: s.q('.ms-mm-heroframe').getAttribute('aria-hidden'), note: s.q('.ms-k-error') !== null, keyFilled: s.recover.querySelector('svg')?.outerHTML.includes('fill="currentColor"'),
      };
      s.menu.dispose();
      return { ok: seen.root === 'ms-main-menu ms-kit ms-k-phone ms-entry-parts' && seen.name === MENU_WORDS.name && seen.join === 'Join Enter a room code' && seen.host === 'Host Open a room for 7–9 players'
        && seen.recover === 'Recover my seat' && seen.settings === 'Display settings' && seen.heroSame && seen.heroHidden === 'true' && !seen.note && seen.keyFilled, seen };
    });

    await check('taps: each choice reports its tap once, and only that; a tap on the hero or the canvas reports nothing', async () => {
      const s = mount();
      tap(s.join); tap(s.host); tap(s.recover); tap(s.settings); tap(s.q('.ms-mm-heroframe')); tap(s.root); tap(s.join.querySelector('.ms-ep-sub'));
      const seen = taps(s.calls);
      s.menu.dispose();
      return { ok: JSON.stringify(seen) === JSON.stringify(['onJoin', 'onHost', 'onRecover', 'onSettings', 'onJoin']), seen };
    });

    await check('offline: the note above Join, an alert with the plain offline icon; the choices refused with the reason, Join and Host keeping their look, Recover dimmed; settings still taps', async () => {
      const s = mount();
      const before = { join: opacity(s.join), host: opacity(s.host), joinBg: getComputedStyle(s.join).backgroundColor };
      s.menu.update(offline);
      await frames();
      const note = s.q('.ms-k-error');
      tap(s.join); tap(s.host); tap(s.recover); tap(s.settings);
      const t = document.createElement('template');
      t.innerHTML = iconSvg('offline', { filled: false, className: 'ms-k-ic' }).trim();
      const want = t.content.firstChild.outerHTML;
      const seen = {
        note: note?.textContent.trim(), role: note?.getAttribute('role'), first: s.q('.ms-mm-actions').firstElementChild === note, icon: note?.querySelector('svg')?.outerHTML === want,
        refused: [s.join, s.host, s.recover].map(n => n.getAttribute('aria-disabled')), reasons: [s.join, s.host, s.recover].map(describedBy),
        opacity: { join: opacity(s.join), host: opacity(s.host), recover: opacity(s.recover), settings: opacity(s.settings) }, joinBg: getComputedStyle(s.join).backgroundColor,
        taps: taps(s.calls),
      };
      s.menu.dispose();
      return { ok: seen.note === MENU_WORDS.offline && seen.role === 'alert' && seen.first && seen.icon && seen.refused.every(v => v === 'true') && seen.reasons.every(r => r === MENU_WORDS.offline)
        && seen.opacity.join === before.join && seen.opacity.host === before.host && seen.opacity.join === '1' && seen.opacity.recover === '0.4' && seen.opacity.settings === '1'
        && seen.joinBg === before.joinBg && JSON.stringify(seen.taps) === '["onSettings"]', seen };
    });

    await check('online again: the note leaves; the same choices take taps, with no reason left', async () => {
      const s = mount({ ...offline, insets: size.insets });
      const nodes = [s.join, s.host, s.recover];
      s.menu.update({ notice: null, join: { enabled: true }, host: { enabled: true }, recover: { enabled: true } });
      tap(s.join); tap(s.host); tap(s.recover);
      const seen = { note: s.q('.ms-k-error') !== null, same: nodes.every(n => s.root.contains(n)), refused: nodes.map(n => n.getAttribute('aria-disabled')), described: nodes.map(n => n.getAttribute('aria-describedby')), taps: taps(s.calls) };
      s.menu.dispose();
      return { ok: !seen.note && seen.same && seen.refused.every(v => v === null) && seen.described.every(v => v === null) && JSON.stringify(seen.taps) === '["onJoin","onHost","onRecover"]', seen };
    });

    await check('busy: a busy choice is refused and says so (aria-busy), not dimmed; the others still tap', async () => {
      const s = mount({ insets: size.insets, join: { enabled: true, busy: true } });
      tap(s.join); tap(s.host);
      const seen = { busy: s.join.getAttribute('aria-busy'), off: s.join.hasAttribute('data-off'), opacity: opacity(s.join), taps: taps(s.calls) };
      s.menu.dispose();
      return { ok: seen.busy === 'true' && !seen.off && seen.opacity === '1' && JSON.stringify(seen.taps) === '["onHost"]', seen };
    });

    await check('not interactive: every control refused, and nothing dimmed', async () => {
      const s = mount({ insets: size.insets, interactive: false });
      tap(s.join); tap(s.host); tap(s.recover); tap(s.settings);
      const all = [s.join, s.host, s.recover, s.settings];
      const seen = { refused: all.map(n => n.getAttribute('aria-disabled')), off: all.map(n => n.hasAttribute('data-off')), opacity: all.map(opacity), taps: taps(s.calls) };
      s.menu.dispose();
      return { ok: seen.refused.every(v => v === 'true') && seen.off.every(v => !v) && seen.opacity.every(v => v === '1') && seen.taps.length === 0, seen };
    });

    await check('focus: a focused choice keeps its element and the focus through updates, offline and back', async () => {
      const s = mount();
      s.host.focus();
      s.menu.update(offline);
      const offlineFocus = document.activeElement === s.host;
      s.menu.update({ notice: null, join: { enabled: true }, host: { enabled: true }, recover: { enabled: true } });
      const seen = { offlineFocus, backFocus: document.activeElement === s.host, same: s.root.contains(s.host) };
      s.menu.dispose();
      return { ok: seen.offlineFocus && seen.backFocus && seen.same, seen };
    });

    await check('insets: Frontend’s safe areas place the settings button 4 px under the top one and the choices 18 px over the bottom one; null gives the browser’s', async () => {
      const s = mount();
      const given = { settings: rel(s, s.settings).top, choices: rel(s, s.q('.ms-mm-actions')).bottom, safe: s.menu.layout().safe };
      s.menu.update({ insets: { top: 20, bottom: 10 } });
      const changed = { settings: rel(s, s.settings).top, choices: rel(s, s.q('.ms-mm-actions')).bottom };
      s.menu.update({ insets: null });
      // A desktop browser has no safe areas: env() gives 0.
      const browser = { settings: rel(s, s.settings).top, choices: rel(s, s.q('.ms-mm-actions')).bottom, safe: s.menu.layout().safe };
      s.menu.dispose();
      const seen = { given, changed, browser };
      return { ok: given.settings === 51 && given.choices === 52 && given.safe.top === 47 && given.safe.bottom === 34 && changed.settings === 24 && changed.choices === 28
        && browser.settings === 4 && browser.choices === 18 && browser.safe.top === 0 && browser.safe.bottom === 0, seen };
    });

    await check('layout: the size, the safe areas and the hero (the top 58 %); onLayout on mount and on a change of size', async () => {
      const s = mount();
      await frames();
      const first = s.menu.layout();
      frame.style.height = '700px';
      await frames(); await frames();
      const second = s.menu.layout();
      const reported = named(s.calls, 'onLayout').map(c => c[1]?.size?.height);
      frame.style.height = `${size.height}px`;
      s.menu.dispose();
      const seen = { first, second, reported };
      return { ok: first.size.width === 390 && first.size.height === 844 && Math.abs(first.hero.height - 844 * 0.58) < 0.01 && first.hero.width === 390
        && second.size.height === 700 && Math.abs(second.hero.height - 700 * 0.58) < 0.01 && reported.includes(844) && reported.includes(700), seen };
    });

    await check('words: brandWordsBox holds the held frame’s drawn ink, “Game N” and “by Plan B”, to half a pixel at both sizes', async () => {
      const seen = {};
      for (const [key, s] of Object.entries(sizes)) {
        Object.assign(frame.style, { width: `${s.width}px`, height: `${s.height}px` });
        const m = mount({ insets: s.insets });
        drawHero(m.menu.hero);
        await frames();
        const box = m.menu.hero.getBoundingClientRect();
        seen[key] = { words: brandWordsBox(box.width, box.height), ink: heroInk(m.menu.hero) };
        m.menu.dispose();
      }
      Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
      return { ok: Object.values(seen).every(v => v.ink && Math.abs(v.words.top - v.ink.top) < 0.5 && Math.abs(v.words.bottom - v.ink.bottom) < 0.5), seen };
    });

    await check('text: the choices grow from the foot up, clear of the settings button; nothing of theirs sits on the hero: at the Standard text no cover, with larger text the canvas covers the hero from 24 px above them, or from 24 px above the brand words where it would cut them, so they go whole or not at all', async () => {
      const seen = {};
      for (const [pct, input] of [[100, { insets: size.insets }], [100, { ...offline, insets: size.insets }], [150, { ...offline, insets: size.insets }], [200, { insets: size.insets }], [200, { ...offline, insets: size.insets }]]) {
        document.documentElement.style.fontSize = `${pct}%`;
        const s = mount(input);
        await frames();
        const actions = rel(s, s.q('.ms-mm-actions')), settings = rel(s, s.settings);
        const first = s.q('.ms-mm-actions').firstElementChild, stackTop = rel(s, first).top;
        const hero = s.q('.ms-mm-heroframe').getBoundingClientRect().height, cover = s.q('.ms-mm-cover');
        const coverTop = cover.hidden ? null : rel(s, cover).top;
        const box = s.menu.hero.getBoundingClientRect(), words = brandWordsBox(box.width, box.height);
        drawHero(s.menu.hero);
        const ink = heroInk(s.menu.hero);
        seen[`${pct}${input.notice ? ' offline' : ''}`] = { stackTop, hero, cover: !cover.hidden, coverTop, want: coverFor(stackTop, hero, words), words, whole: wordsWhole(coverTop, ink),
          actionsBottom: actions.bottom, clearOfSettings: actions.top > settings.top + settings.height, join: s.join.getBoundingClientRect().height };
        s.menu.dispose();
      }
      document.documentElement.style.fontSize = '';
      // At 390 × 844 the Largest text offline lifts the cover above the words; online it starts below them.
      const lifted = v => Math.abs(v.coverTop - (v.words.top - COVER_LEAD_PX)) < 0.05;
      const ok = Object.entries(seen).every(([key, v]) => v.actionsBottom === 52 && v.clearOfSettings && v.whole
        && (v.want === null ? !v.cover : v.cover && Math.abs(v.coverTop - v.want) < 0.05)
        && (!key.startsWith('100') || (!v.cover && v.stackTop >= v.hero)))
        && seen['200 offline'].cover && lifted(seen['200 offline']) && seen['200 offline'].join > 76
        && seen['200'].cover && !lifted(seen['200']) && seen['200'].coverTop >= seen['200'].words.bottom;
      return { ok, seen };
    });

    await check('input: malformed input is refused', async () => {
      const bad = [{ notice: 'bogus' }, { insets: { top: 'a' } }, { join: null }, { settings: null }];
      const refused = bad.map(input => { try { nextMainMenuInput(MAIN_MENU_DEFAULTS, input); return false; } catch { return true; } });
      return { ok: refused.every(Boolean), refused };
    });

    await check('dispose: safe twice; afterwards nothing fires, layout() is null and nothing is left', async () => {
      const s = mount({ ...offline, insets: size.insets });
      const join = s.join, settings = s.settings;
      s.menu.dispose(); s.menu.dispose();
      tap(join); tap(settings);
      s.menu.update({ notice: null });
      const seen = { left: frame.childElementCount, layout: s.menu.layout(), taps: taps(s.calls), reasons: document.querySelectorAll('.ms-k-vh').length };
      return { ok: seen.left === 0 && seen.layout === null && seen.taps.length === 0 && seen.reasons === 0, seen };
    });
  }

  await check(`motion: none of its own; nothing animates at rest or on a change${deviceReduced ? ' (the device’s Reduce motion)' : ''}`, async () => {
    const s = mount();
    s.menu.update(offline);
    await frames();
    const running = s.root.getAnimations({ subtree: true }).length;
    s.menu.update({ reducedMotion: true });
    const reduced = s.root.dataset.motion;
    s.menu.dispose();
    const seen = { running, reduced };
    return { ok: running === 0 && reduced === 'reduced', seen };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
