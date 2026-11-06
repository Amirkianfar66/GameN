// The role reveal films (the owner, 6 November 2026; docs/design/cinematic/role-reveal.md): one
// ten-second film per role on the player's own phone. Each opens in the briefing room at the dock,
// where the player's own character takes the role's gadget from the desk where their role card
// stands, and then turns to a comic page of three panels with their narration: a small back story,
// two panels of memory in sepia and one aboard. These tests hold the privacy rules every film keeps
// (one length, one rhythm, silence, one palette, only shipped pictures, no words in the picture),
// the shared opener, the card that matches the phone's role card, and the Doctor's pilot.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CREW } from '../../../design/board-motion/figures/crew.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { MEDICAL } from '../../../design/board-v2/fx/medical.mjs';
import { CATALOGUE } from '../../../design/cinematic/catalogue/catalogue.mjs';
import { measure } from '../../../design/cinematic/lib/lettering.mjs';
import { figureItems } from '../../../design/cinematic/lib/scene.mjs';
import { PILOTS } from '../../../design/cinematic/pilots/index.mjs';
import { GRIP, deviceOnly, sepiaOf, unaccented } from '../../../design/cinematic/pilots/role-reveal/art.mjs';
import { POSES, briefingLayout, briefingSvg, onPage } from '../../../design/cinematic/pilots/role-reveal/briefing.mjs';
import { PAGE_WIDTH, cameraView, layout, pageHeight, revealSvg } from '../../../design/cinematic/pilots/role-reveal/compose.mjs';
import { DOCTOR_PANELS } from '../../../design/cinematic/pilots/role-reveal/doctor.mjs';
import { ROLE_REVEAL_COPY } from '../../../design/cinematic/pilots/role-reveal/copy.mjs';
import { BEATS, CHANGES, FADE_MS, PANEL_STARTS, PANEL_TONES, REVEAL_END, STILLS, VARIANTS, revealFrame } from '../../../design/cinematic/pilots/role-reveal/film.mjs';
import { DEVICE_FILES, EMBLEM_FILES, FILM_OF, PORTRAIT_FILES, ROLE_FILMS, ROLE_REVEAL_ASSETS, TEAMS } from '../../../design/cinematic/pilots/role-reveal/roles.mjs';
import { CURRENT_ROLES, usesCurrentNames } from '../../../design/library/successor/names.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CINE = resolve(ROOT, 'design/cinematic');
const PHONES = [[320, 568], [360, 640], [360, 780], [375, 667], [390, 844], [414, 896], [430, 932]];
const SAMPLES = [0, 200, 600, 1250, 1299, 1300, 1800, 2400, 2999, 3000, 3100, 3600, 4400, 4499, 4500, 4700, 5300, 5999, 6000, 6200, 6800, 7799, 7800, 8100, 8600, 9299, 9300, 9999, 10000];
const CHARACTERS = Object.keys(CREW);
/** A role's gadget as a client gets it: the role card's held device, read and stripped of its hand. */
const gadget = role => deviceOnly(readFileSync(resolve(CINE, DEVICE_FILES[role]), 'utf8'));
const doctor = (t, options = {}) => revealSvg(t, { role: 'Doctor', seat: 6, character: 'c4', gadget: gadget('Doctor'), width: PAGE_WIDTH, height: pageHeight(390, 844), ...options });
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const nearAccents = hex => Object.entries(FACTION_ACCENTS).filter(([, accent]) => cie76(hex, accent) < MIN_ACCENT_DISTANCE).map(([faction]) => faction);
/** The role card's team swatch (the phone's card: a small square in the team's colour), and the picture without it. */
const SWATCH = /<rect data-part="team-swatch"[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*\/>/;
const unswatched = svg => svg.replace(SWATCH, '');
/** One of the opener's marked parts (the role card, the gadget), cut out of the picture: balanced <g> tags. */
function cut(svg, part) {
  const open = svg.indexOf(`<g data-part="${part}"`);
  assert.ok(open >= 0, `the opener draws its ${part}`);
  const tags = /<g\b[^>]*?(\/?)>|<\/g>/g;
  tags.lastIndex = open;
  let depth = 0, m;
  while ((m = tags.exec(svg))) {
    if (m[0].startsWith('</g')) depth -= 1;
    else if (m[1] !== '/') depth += 1;
    if (depth === 0) return { part: svg.slice(open, tags.lastIndex), rest: svg.slice(0, open) + `<!--${part}-->` + svg.slice(tags.lastIndex) };
  }
  throw new Error(`unbalanced ${part}`);
}

test('the nine current roles each have a film, a team, a device and an emblem that exist, and only the Doctor is drawn so far', () => {
  assert.deepEqual(Object.keys(ROLE_FILMS).sort(), [...CURRENT_ROLES].sort());
  const count = team => Object.values(TEAMS).filter(t => t === team).length;
  assert.deepEqual([count('Blue'), count('Red'), count('Alien')], [5, 3, 1], 'game-design.md: nine roles, five Blue, three Red, the Alien');
  for (const role of CURRENT_ROLES) {
    const film = ROLE_FILMS[role];
    assert.ok(existsSync(resolve(CINE, film.device)), `${role}: device ${film.device}`);
    assert.ok(existsSync(resolve(CINE, film.emblem)), `${role}: emblem ${film.emblem}`);
    assert.equal(film.emblem, EMBLEM_FILES[TEAMS[role]]);
  }
  assert.equal(FILM_OF['Blue Disabler'], FILM_OF['Red Disabler'], 'the two Disablers share one film');
  assert.equal(new Set(Object.values(DEVICE_FILES)).size, 9, 'each role draws its own device');
  assert.equal(ROLE_REVEAL_ASSETS.length, 21, 'nine devices, three emblems and nine crew portraits, shipped to every phone');
  assert.deepEqual(Object.keys(PORTRAIT_FILES), CHARACTERS, 'a portrait for every crew character');
  for (const href of Object.values(PORTRAIT_FILES)) assert.ok(existsSync(resolve(CINE, href)), href);
  assert.deepEqual(CURRENT_ROLES.filter(role => ROLE_FILMS[role].status === 'pilot'), ['Doctor']);
  for (const role of CURRENT_ROLES.filter(r => r !== 'Doctor')) assert.throws(() => revealSvg(1000, { role }), /storyboard/, `${role}: no half-drawn film`);
  assert.ok(PILOTS['role-reveal']?.surfaces.phone, 'on the stage, on a phone');
});

test('every film keeps one clock: 10000 ms, the same beats and the same moments of change, full and reduced', () => {
  assert.equal(REVEAL_END, 10000);
  const beats = Object.values(BEATS);
  assert.equal(beats[0][0], 0);
  for (let i = 1; i < beats.length; i += 1) assert.equal(beats[i][0], beats[i - 1][1], 'the beats are contiguous');
  assert.equal(beats.at(-1)[1], REVEAL_END);
  assert.deepEqual([...CHANGES], beats.slice(1).map(b => b[0]));
  assert.deepEqual([...PANEL_STARTS], [3000, 4500, 6000]);
  assert.deepEqual([...PANEL_TONES], ['past', 'past', 'present'], 'two panels of memory, then aboard: the same for every role');
  assert.deepEqual([...BEATS.opener], [0, 3000], 'the briefing room opens every film');
  // The frame function takes no role: no film can stretch, shorten or re-time a beat.
  for (const variant of VARIANTS) {
    const shape = t => { const fr = revealFrame(t, { variant }); return `${fr.panels.map(p => (p.visible ? 1 : 0)).join('')}${fr.title.visible ? 1 : 0}`; };
    const changes = [];
    for (let t = 10; t <= REVEAL_END; t += 10) if (shape(t) !== shape(t - 10)) changes.push(t);
    for (const t of changes) assert.ok(CHANGES.includes(t), `${variant}: the picture changes beat at ${t} ms, a moment every role shares`);
    assert.equal(revealFrame(REVEAL_END, { variant }).done, true);
    assert.equal(revealFrame(REVEAL_END - 1, { variant }).done, false);
    for (const t of SAMPLES) assert.deepEqual(doctor(t, { variant }).frame, revealFrame(t, { variant }), `the Doctor's frame is the shared clock's at ${t}`);
  }
});

test('reduced motion: three stills, each faded in over 80 ms at the same moments, and nothing else moves', () => {
  assert.deepEqual(STILLS.map(s => s.at), [0, 3000, 7800]);
  const pictures = new Set();
  for (const [i, { at }] of STILLS.entries()) {
    const until = STILLS[i + 1]?.at ?? REVEAL_END;
    const rest = doctor(at + FADE_MS, { variant: 'reduced' }).svg;
    for (const t of [at + FADE_MS + 1, at + 400, Math.round((at + until) / 2), until - 1]) assert.equal(doctor(t, { variant: 'reduced' }).svg, rest, `still ${i} holds at ${t} ms`);
    assert.notEqual(doctor(at + FADE_MS / 2, { variant: 'reduced' }).svg, rest, `still ${i} fades in`);
    pictures.add(rest);
  }
  assert.equal(pictures.size, 3);
  const page = doctor(5000, { variant: 'reduced' }).frame;
  assert.ok(page.panels.every(p => p.visible && p.enter === 1), 'the page still holds all three panels at rest');
  const first = doctor(1000, { variant: 'reduced' }).frame.opener;
  assert.deepEqual([first.grip, first.raise, first.glint, first.push], [true, 1, 0, 0], 'the first still: the gadget raised, no glint, no push');
  assert.ok(!doctor(1000, { variant: 'reduced' }).svg.includes('-pool-glint'), 'no glint in reduced motion');
  assert.equal(revealFrame(8600, { variant: 'reduced' }).title.sweep, 0, 'no sheen in reduced motion');
  assert.ok(doctor(8600).svg.includes('-sheen') && !doctor(8600, { variant: 'reduced' }).svg.includes('-sheen'), 'the sheen crosses the plate in full motion only');
});

test('a frame is one self-contained SVG: no words drawn in, no repeated id, only the pictures every phone ships, deterministic', () => {
  for (const variant of VARIANTS) {
    for (const t of SAMPLES) {
      const { svg } = doctor(t, { variant });
      assert.equal((svg.match(/<svg[\s>]/g) ?? []).length, 1 + (svg.match(/<svg x=/g) ?? []).length, 'one root (nested pictures only)');
      assert.ok(!/<text[\s>]/.test(svg), 'words are page text, never drawn in');
      const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      assert.equal(new Set(ids).size, ids.length, `no repeated id at ${t} (${variant})`);
      for (const [, href] of svg.matchAll(/<image href="([^"]+)"/g)) assert.ok(ROLE_REVEAL_ASSETS.includes(href), `${href}: a shipped picture`);
      assert.ok(!/(?:href="|url\()https?:/.test(svg), 'nothing fetched from elsewhere (references only; the xmlns is a name, not a fetch)');
      assert.equal(doctor(t, { variant }).svg, svg, 'deterministic');
    }
  }
});

test('silent: no film has a cue sheet or an audio export', () => {
  const audio = JSON.parse(readFileSync(resolve(CINE, 'exports/audio.json'), 'utf8'));
  assert.ok(!JSON.stringify(audio).includes('role-reveal'), 'no cue sheet');
  assert.ok(!existsSync(resolve(CINE, 'exports/role-reveal/audio')), 'no audio export');
  for (const name of ['doctor-phone390-full', 'doctor-phone390-reduced', 'doctor-phone320-full']) {
    const record = JSON.parse(readFileSync(resolve(CINE, `exports/role-reveal/review/${name}.render.json`), 'utf8'));
    const video = record.outputs.find(o => o.kind === 'video');
    assert.equal(video.audio, null, `${name}: no sound`);
    assert.equal(video.durationMs, REVEAL_END, `${name}: the shared length`);
  }
});

test('one palette: no colour drawn comes within the accent distance of a faction accent, the gadget included', () => {
  const drawn = new Set();
  for (const variant of VARIANTS) {
    for (const t of SAMPLES) {
      const { svg } = doctor(t, { variant });
      // The one exception, as on the phone's card: the team swatch on the role card standing on the desk, small.
      const swatch = SWATCH.exec(svg);
      if (swatch) assert.equal(swatch[1].toUpperCase(), FACTION_ACCENTS.blue, 'the Doctor\'s card: the Blue team\'s swatch');
      for (const hex of colours(unswatched(svg))) drawn.add(hex);
    }
  }
  assert.ok(drawn.size > 10);
  for (const hex of drawn) assert.deepEqual(nearAccents(hex), [], `${hex} is within ${MIN_ACCENT_DISTANCE} of a faction accent`);
  // The role card lights each device in its team's colour; in the film every gadget catches the room's light instead.
  for (const role of CURRENT_ROLES) {
    const own = gadget(role);
    assert.ok([...colours(own)].some(hex => nearAccents(hex).length > 0), `${role}: the card's device carries its team's accent`);
    for (const hex of colours(unaccented(own))) assert.deepEqual(nearAccents(hex), [], `${role}'s gadget: ${hex}`);
  }
  // The back story's panels are drawn through the sepia filter: every colour in them, as the filter
  // draws it, keeps the palette too (the player's own character included, so for every character).
  const height = pageHeight(390, 844), box = layout(height).panels[0];
  for (const character of CHARACTERS) {
    for (const [i, panel] of DOCTOR_PANELS.entries()) {
      if (PANEL_TONES[i] !== 'past') continue;
      for (const local of [0, 400, 1300, 3000]) {
        for (const hex of colours(panel(local, { w: box.w, h: box.h, prefix: `rr-p${i}`, character }))) assert.deepEqual(nearAccents(sepiaOf(hex)), [], `panel ${i + 1} (${character}): ${hex} drawn as ${sepiaOf(hex)}`);
      }
    }
  }
  // The player's own character keeps its own colours (public from the lobby, the same whatever the role
  // dealt); every other colour keeps the palette, whoever the character.
  for (const character of CHARACTERS) {
    const own = colours(figureItems({ character, sk: POSES.raise, at: [0, 0], scale: 1, depth: 2, prefix: 'x' }).map(item => item.svg).join(''));
    for (const hex of colours(unswatched(doctor(2400, { character }).svg))) if (!own.has(hex)) assert.deepEqual(nearAccents(hex), [], `${character}: ${hex}`);
  }
});

test('the words: a back story in three narration boxes and a line under the title, for every role, current names only', () => {
  for (const role of CURRENT_ROLES) {
    const copy = ROLE_REVEAL_COPY[role];
    assert.equal(copy?.story?.length, 3, `${role}: three narration boxes`);
    assert.ok(copy.play, `${role}: the line under the title`);
    for (const line of [...copy.story, copy.play]) {
      assert.ok(usesCurrentNames(line), `${role}: current names in "${line}"`);
      assert.ok(line.length <= 100, `${role}: a short line`);
    }
    for (const line of copy.story) assert.ok(line.length <= 52, `${role}: "${line}" fits a narration box`);
  }
  // What the rules give, in the story's last box (aboard) or under the title.
  assert.match(ROLE_REVEAL_COPY.Doctor.story[1], /two doses/);
  assert.match(ROLE_REVEAL_COPY.Doctor.story[2], /your number is the Hospital panel's code/);
  assert.match(ROLE_REVEAL_COPY.Doctor.play, /Two doses for the whole voyage/);
  for (const name of ['Undercover', 'Alien', 'Doctor']) assert.ok(ROLE_REVEAL_COPY.Insider.story[2].includes(name));
  assert.match(ROLE_REVEAL_COPY['Red Disabler'].play, /Undercover/);
  for (const line of [...ROLE_REVEAL_COPY['Blue Disabler'].story, ROLE_REVEAL_COPY['Blue Disabler'].play]) assert.ok(!line.includes('Undercover'), 'only the Red Disabler knows the Undercover');
  // Each panel's narration comes with its panel and stays until the title; then the line under the title.
  const at = t => doctor(t).words;
  assert.deepEqual(at(2400).story.map(s => s.opacity), [0, 0, 0], 'the opener has no words');
  assert.deepEqual(at(3600).story.map(s => s.opacity), [1, 0, 0]);
  assert.deepEqual(at(5100).story.map(s => s.opacity), [1, 1, 0]);
  assert.deepEqual(at(7400).story.map(s => s.opacity), [1, 1, 1]);
  assert.deepEqual(at(7400).story.map(s => s.text), [...ROLE_REVEAL_COPY.Doctor.story]);
  assert.deepEqual(at(7400).story.map(s => s.tone), ['past', 'past', 'present']);
  const { story, play, role } = at(9000);
  assert.deepEqual(story.map(s => s.opacity), [0, 0, 0]);
  assert.deepEqual([play.text, play.opacity], [ROLE_REVEAL_COPY.Doctor.play, 1]);
  assert.deepEqual([role.text, role.visible], ['Your role: Doctor.', true]);
  assert.equal(at(2400).role.visible, false, 'the role is named on the card in the picture, and in page text at the title');
  assert.deepEqual(doctor(5000, { variant: 'reduced' }).words.story.map(s => s.opacity), [1, 1, 1], 'reduced motion: the page still carries all three');
});

test('the page fits every phone: panels, the title plate and the captions inside, panels tall enough to read', () => {
  for (const [w, h] of PHONES) {
    const H = pageHeight(w, h);
    const L = layout(H);
    for (const p of L.panels) {
      assert.ok(p.x >= 0 && p.x + p.w <= PAGE_WIDTH && p.y >= 0 && p.y + p.h <= H, `${w}x${h}: a panel inside the page`);
      assert.ok(p.h >= 360, `${w}x${h}: a panel ${p.h.toFixed(0)} units tall`);
    }
    for (const c of [...Object.values(L.captions), ...L.story]) assert.ok(c.x >= 0 && c.x + c.w <= PAGE_WIDTH && c.y >= 0 && c.y + c.h <= H, `${w}x${h}: a caption inside the page`);
    L.story.forEach((box, i) => {
      const p = L.panels[i];
      assert.ok(box.y < p.y && box.y + box.h > p.y, `${w}x${h}: narration ${i + 1} rides its panel's top edge`);
      if (i > 0) assert.ok(box.y >= L.panels[i - 1].y + L.panels[i - 1].h, `${w}x${h}: narration ${i + 1} clear of the panel above`);
    });
    // The briefing room: the viewport, the desk, the card, the character and the gadget, inside the page.
    const B = briefingLayout(PAGE_WIDTH, H);
    const inside = ([x, y], what) => assert.ok(x >= 0 && x <= PAGE_WIDTH && y >= 0 && y <= H, `${w}x${h}: ${what} at ${x.toFixed(0)}, ${y.toFixed(0)}`);
    assert.ok(B.window.x >= 0 && B.window.x + B.window.w <= PAGE_WIDTH && B.window.y >= 0, `${w}x${h}: the viewport`);
    assert.ok(B.window.y + B.window.h < B.deskTop && B.deskTop < B.deskFront && B.deskFront <= H, `${w}x${h}: the viewport, then the desk`);
    inside([B.card.x + B.card.w, B.card.y + B.card.h], 'the card');
    inside(B.rest, 'the gadget on the desk');
    const head = onPage(B.at, B.scale, POSES.stand.head);
    inside(head, 'the character\'s head');
    assert.ok(head[1] > B.window.y && head[1] < B.deskTop, `${w}x${h}: the head between the viewport's top and the desk`);
    const raised = onPage(B.at, B.scale, POSES.raise.wN);
    inside([raised[0], raised[1] - GRIP[1] * B.scale * 0.5], 'the raised gadget');
  }
});

test('the Doctor\'s pilot: its own device in the opener, and the Hospital panel lights the player\'s own number only', () => {
  const opener = doctor(1200).svg;
  assert.ok(opener.includes(DEVICE_FILES.Doctor), 'the role card on the desk draws the injector');
  assert.ok(cut(opener, 'gadget').part.includes('device-cracker-head'), 'the gadget is the injector');
  for (const role of CURRENT_ROLES.filter(r => r !== 'Doctor')) assert.ok(!opener.includes(DEVICE_FILES[role]), `no ${role} device`);
  const at = seat => doctor(7000, { seat }).svg;
  assert.notEqual(at(6), at(3), 'the readout shows the player\'s own number');
  assert.equal(at(null), at(0), 'without a valid number nothing is lit');
  const lit = svg => (svg.match(/fill="#F2C14E" opacity="1"/g) ?? []).length;
  assert.ok(lit(at(6)) > lit(at(null)), 'a number lights its segments and its key');
});

test('the opener: the player\'s own character takes the role\'s gadget from the desk where the role card lies', () => {
  assert.throws(() => revealSvg(1000, { role: 'Doctor', character: 'c4' }), /gadget/, 'the gadget is the caller\'s to read');
  assert.throws(() => revealSvg(1000, { role: 'Doctor', gadget: gadget('Doctor') }), /character/, 'never a stand-in character');
  assert.throws(() => doctor(1000, { character: 'c10' }), /character/);
  const pictures = new Set(CHARACTERS.map(character => doctor(600, { character }).svg));
  assert.equal(pictures.size, CHARACTERS.length, 'each character draws itself');
  // The gadget waits on the desk, is taken at 1300 ms and rises with the hand.
  const place = t => cut(doctor(t).svg, 'gadget').part.match(/^<g data-part="gadget" transform="translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number);
  const B = briefingLayout(PAGE_WIDTH, pageHeight(390, 844));
  for (const t of [0, 600, 1299]) assert.deepEqual(place(t), B.rest.map(v => Number(v.toFixed(2))), `on the desk at ${t} ms`);
  assert.ok(place(2400)[1] < place(1300)[1] - 100, 'raised into the light');
  assert.ok(doctor(2350).svg.includes('-pool-glint') && !doctor(1000).svg.includes('-pool-glint'), 'it glints once raised');
  // The hand only: deviceOnly() takes the arm and the fist off every role's held device.
  for (const role of CURRENT_ROLES) {
    const own = gadget(role);
    assert.ok(!/id="[^"]*-(arm|fist)"/.test(own), `${role}: no arm or fist`);
    assert.ok(/id="[^"]*-head"/.test(own) && /id="[^"]*-glow"/.test(own), `${role}: the device itself kept`);
  }
});

test('the card on the desk is the player\'s own role card as the phone draws it: straight, their portrait, the role\'s device', () => {
  for (const character of CHARACTERS) {
    const { part } = cut(doctor(1000, { character }).svg, 'card');
    assert.ok(part.includes(PORTRAIT_FILES[character]), `${character}: their own portrait`);
    for (const other of CHARACTERS.filter(c => c !== character)) assert.ok(!part.includes(PORTRAIT_FILES[other]), `${character}: no ${other} portrait`);
    assert.ok(part.includes(DEVICE_FILES.Doctor), 'the Doctor\'s held device, as on the card');
    // The owner's review: nothing on the card is turned. The card stands straight (a translate only), and
    // the only turn inside it is the portrait's own -2.5°, as the phone's card turns it.
    assert.match(part, /^<g data-part="card" transform="translate\([-\d.]+ [-\d.]+\)">/);
    assert.deepEqual([...part.matchAll(/rotate\(([-\d.]+)/g)].map(m => Number(m[1])).filter(a => a !== 0), [-2.5], 'only the portrait turns');
    assert.ok(!/skewX\((?!0\))/.test(part), 'no slant on the card or its words');
  }
  // The name fits the card: the longest role name stays inside the plate.
  const B = briefingLayout(PAGE_WIDTH, pageHeight(390, 844));
  const longest = briefingSvg('rr', { width: PAGE_WIDTH, height: pageHeight(390, 844), opener: revealFrame(1000).opener, name: 'BLUE DISABLER', team: 'Blue', teamColour: FACTION_ACCENTS.blue, character: 'c4', gadget: gadget('Blue Disabler'), grip: GRIP, deviceHref: DEVICE_FILES['Blue Disabler'], portraitHref: PORTRAIT_FILES.c4 });
  const words = [...cut(longest, 'card').part.matchAll(/<g opacity="1" transform="translate\(([-\d.]+) [-\d.]+\) rotate\(0\) skewX\(0\) scale\(([-\d.]+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(words.length, 2, 'the name and the team line, set flat');
  for (const [[x, k], [word, tracking]] of words.map((w, i) => [w, [['BLUE DISABLER', 1.1], ['BLUE TEAM', 1.3]][i]])) {
    const half = (measure(word, tracking) * k) / 2;
    assert.ok(x - half >= 0 && x + half <= B.card.w, `${word} inside the card (${(x - half).toFixed(1)} to ${(x + half).toFixed(1)} of ${B.card.w.toFixed(1)})`);
  }
});

test('the opener is one scene for every role: only the card\'s name and picture and the gadget are the role\'s', () => {
  const height = pageHeight(390, 844);
  for (const t of [600, 1800, 2400]) {
    const opener = revealFrame(t).opener;
    const scenes = CURRENT_ROLES.map(role => {
      const team = TEAMS[role];
      const svg = briefingSvg('rr', { width: PAGE_WIDTH, height, opener, name: role.toUpperCase(), team, teamColour: FACTION_ACCENTS[team.toLowerCase()], character: 'c4', gadget: gadget(role), grip: GRIP, deviceHref: DEVICE_FILES[role], portraitHref: PORTRAIT_FILES.c4, t });
      const card = cut(svg, 'card');
      const { part, rest } = cut(card.rest, 'gadget');
      assert.ok(card.part.includes(DEVICE_FILES[role]) && card.part.includes(PORTRAIT_FILES.c4), `${role}: its card, with the player's portrait`);
      assert.equal(SWATCH.exec(card.part)[1].toUpperCase(), FACTION_ACCENTS[team.toLowerCase()], `${role}: its team's swatch`);
      assert.ok(part.includes('-head'), `${role}: its gadget`);
      for (const other of CURRENT_ROLES.filter(r => r !== role)) assert.ok(!svg.includes(DEVICE_FILES[other]), `${role}: no ${other} picture`);
      return rest;
    });
    assert.equal(new Set(scenes).size, 1, `at ${t} ms the room, the light, the character and the camera are the same for every role`);
  }
});

test('the Doctor\'s back story: memory in sepia, the player\'s own character in it, the last two doses, then aboard', () => {
  const page = doctor(7400).svg;
  assert.equal((page.match(/filter="url\(#rr-sepia\)"/g) ?? []).length, 2, 'two panels of memory, then one aboard');
  const height = pageHeight(390, 844), box = layout(height).panels[0];
  const colony = character => DOCTOR_PANELS[0](800, { w: box.w, h: box.h, prefix: 'rr-p0', character });
  assert.equal(new Set(CHARACTERS.map(colony)).size, CHARACTERS.length, 'the colony panel draws the player\'s own character');
  const doses = DOCTOR_PANELS[1](800, { w: box.w, h: box.h, prefix: 'rr-p1' });
  assert.equal((doses.match(new RegExp(`<rect[^>]*fill="${MEDICAL.cyan}"`, 'g')) ?? []).length, 2, 'two doses left in the case');
});

test('the motion comic: the memory flash, the guided view and the panels\' focus, the same for every role and full motion only', () => {
  const full = t => revealFrame(t), reduced = t => revealFrame(t, { variant: 'reduced' });
  // The flash swells out of the glint and clears on the back story's first panel.
  assert.deepEqual([full(2600).flash, full(3400).flash], [0, 0]);
  assert.ok(full(2950).flash > 0.95 && full(2800).flash > 0 && full(3100).flash > 0);
  assert.ok(doctor(2950).svg.includes('rr-flash') && !doctor(2400).svg.includes('rr-flash'));
  // The guided view: the page before the panels and at the title, a panel while it plays.
  const H = pageHeight(390, 844), L = layout(H);
  const view = t => cameraView(full(t).camera, L, H);
  assert.deepEqual([view(2000).k, view(9000).k], [1, 1], 'the whole page');
  for (const [t, i] of [[4000, 0], [5300, 1], [6800, 2]]) {
    const { k, cy } = view(t);
    assert.ok(k > 1, `${t} ms: a closer view`);
    assert.ok(cy - H / (2 * k) <= L.panels[i].y && cy + H / (2 * k) >= L.panels[i].y + L.panels[i].h * 0.9, `${t} ms: panel ${i + 1} in view`);
  }
  // The page text rides the camera: a narration box is where its panel is drawn.
  const at5300 = doctor(5300).words.story[1].box, v = view(5300);
  assert.deepEqual(at5300.map(n => Math.round(n)), v.box([L.story[1].x, L.story[1].y, L.story[1].w, L.story[1].h]).map(n => Math.round(n)));
  // Focus: an earlier panel steps back while a later one plays, and all come back for the page.
  assert.ok(full(5300).focus[0] < 0.7 && full(5300).focus[1] === 1);
  assert.deepEqual(full(7800).focus, [1, 1, 1]);
  // Reduced motion: none of it.
  for (const t of [2950, 5300, 6800]) {
    assert.equal(reduced(t).flash, 0);
    assert.deepEqual(reduced(t).camera, { from: -1, to: -1, v: 1 });
    assert.deepEqual(reduced(t).focus, [1, 1, 1]);
  }
  // Print: the paper grain, the same every frame, and the player's character inked with a bold outline.
  const grain = svg => svg.match(/<pattern id="rr-paper"[\s\S]*?<\/pattern>/)?.[0];
  assert.ok(grain(doctor(1000).svg) && grain(doctor(1000).svg) === grain(doctor(8000).svg));
  assert.match(doctor(1000).svg, /<g filter="url\(#rr-outline\)"><g filter="url\(#rr-noir\)">/);
});

test('the motion bible\'s role reveal entry carries the films', () => {
  const scene = CATALOGUE.find(s => s.id === 'role-reveal');
  assert.match(scene.beats.start, /ten-second film/);
  assert.match(scene.beats.start, /back story/);
  assert.match(scene.beats.start, /briefing room/);
  assert.match(scene.durations.full, /10000 ms, the same length and beats for every role/);
  assert.match(scene.audio, /silent/);
  assert.ok(scene.assets.some(a => a.startsWith('design/cinematic/pilots/role-reveal/')));
});
