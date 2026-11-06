// The role reveal films (the owner, 6 November 2026; docs/design/cinematic/role-reveal.md): one
// seven-second film per role on the player's own phone. These tests hold the privacy rules every film
// keeps (one length, one rhythm, silence, one palette, only shipped pictures, no words in the picture)
// and the Doctor's pilot.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { CATALOGUE } from '../../../design/cinematic/catalogue/catalogue.mjs';
import { PILOTS } from '../../../design/cinematic/pilots/index.mjs';
import { PAGE_WIDTH, layout, pageHeight, revealSvg } from '../../../design/cinematic/pilots/role-reveal/compose.mjs';
import { ROLE_REVEAL_COPY } from '../../../design/cinematic/pilots/role-reveal/copy.mjs';
import { BEATS, CHANGES, FADE_MS, PANEL_STARTS, REVEAL_END, STILLS, VARIANTS, revealFrame } from '../../../design/cinematic/pilots/role-reveal/film.mjs';
import { DEVICE_FILES, EMBLEM_FILES, FILM_OF, ROLE_FILMS, ROLE_REVEAL_ASSETS, TEAMS } from '../../../design/cinematic/pilots/role-reveal/roles.mjs';
import { CURRENT_ROLES, usesCurrentNames } from '../../../design/library/successor/names.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CINE = resolve(ROOT, 'design/cinematic');
const PHONES = [[320, 568], [360, 640], [360, 780], [375, 667], [390, 844], [414, 896], [430, 932]];
const SAMPLES = [0, 300, 900, 1400, 1500, 1640, 2000, 2800, 3100, 3600, 4100, 4500, 5000, 5499, 5500, 5700, 6000, 6600, 6999, 7000];
const doctor = (t, options = {}) => revealSvg(t, { role: 'Doctor', seat: 6, width: PAGE_WIDTH, height: pageHeight(390, 844), ...options });

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
  assert.equal(ROLE_REVEAL_ASSETS.length, 12, 'nine devices and three emblems, shipped to every phone');
  assert.deepEqual(CURRENT_ROLES.filter(role => ROLE_FILMS[role].status === 'pilot'), ['Doctor']);
  for (const role of CURRENT_ROLES.filter(r => r !== 'Doctor')) assert.throws(() => revealSvg(1000, { role }), /storyboard/, `${role}: no half-drawn film`);
  assert.ok(PILOTS['role-reveal']?.surfaces.phone, 'on the stage, on a phone');
});

test('every film keeps one clock: 7000 ms, the same beats and the same moments of change, full and reduced', () => {
  assert.equal(REVEAL_END, 7000);
  const beats = Object.values(BEATS);
  assert.equal(beats[0][0], 0);
  for (let i = 1; i < beats.length; i += 1) assert.equal(beats[i][0], beats[i - 1][1], 'the beats are contiguous');
  assert.equal(beats.at(-1)[1], REVEAL_END);
  assert.deepEqual([...CHANGES], beats.slice(1).map(b => b[0]));
  assert.deepEqual([...PANEL_STARTS], [1500, 2800, 4100]);
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
  assert.deepEqual(STILLS.map(s => s.at), [0, 1500, 5500]);
  const pictures = new Set();
  for (const [i, { at }] of STILLS.entries()) {
    const until = STILLS[i + 1]?.at ?? REVEAL_END;
    const rest = doctor(at + FADE_MS, { variant: 'reduced' }).svg;
    for (const t of [at + FADE_MS + 1, at + 400, Math.round((at + until) / 2), until - 1]) assert.equal(doctor(t, { variant: 'reduced' }).svg, rest, `still ${i} holds at ${t} ms`);
    assert.notEqual(doctor(at + FADE_MS / 2, { variant: 'reduced' }).svg, rest, `still ${i} fades in`);
    pictures.add(rest);
  }
  assert.equal(pictures.size, 3);
  const page = doctor(3000, { variant: 'reduced' }).frame;
  assert.ok(page.panels.every(p => p.visible && p.enter === 1), 'the page still holds all three panels at rest');
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

test('one palette: no colour drawn in the art comes within the accent distance of a faction accent', () => {
  const colours = new Set();
  for (const variant of VARIANTS) for (const t of SAMPLES) for (const [hex] of doctor(t, { variant }).svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)) colours.add(hex.toUpperCase());
  assert.ok(colours.size > 10);
  for (const hex of colours) {
    for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) {
      assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${hex} is ${cie76(hex, accent).toFixed(1)} from the ${faction} accent`);
    }
  }
});

test('the captions: two lines for every role, current names only, saying what the rules give', () => {
  for (const role of CURRENT_ROLES) {
    const copy = ROLE_REVEAL_COPY[role];
    assert.ok(copy?.purpose && copy?.play, `${role}: two lines`);
    assert.ok(usesCurrentNames(copy.purpose) && usesCurrentNames(copy.play), `${role}: current names`);
  }
  assert.match(ROLE_REVEAL_COPY.Doctor.play, /player number is the Hospital panel's code/);
  assert.match(ROLE_REVEAL_COPY.Doctor.purpose, /Two doses/);
  for (const name of ['Undercover', 'Alien', 'Doctor']) assert.ok(ROLE_REVEAL_COPY.Insider.purpose.includes(name));
  assert.match(ROLE_REVEAL_COPY['Red Disabler'].play, /Undercover/);
  assert.ok(!ROLE_REVEAL_COPY['Blue Disabler'].play.includes('Undercover'), 'only the Red Disabler knows the Undercover');
  const { words } = doctor(6000);
  assert.equal(words.purpose.opacity, 0);
  assert.equal(words.play.text, ROLE_REVEAL_COPY.Doctor.play);
  assert.equal(words.role.text, 'Your role: Doctor.');
  assert.equal(doctor(3000).words.purpose.opacity, 1);
});

test('the page fits every phone: panels, the title plate and the captions inside, panels tall enough to read', () => {
  for (const [w, h] of PHONES) {
    const H = pageHeight(w, h);
    const L = layout(H);
    for (const p of L.panels) {
      assert.ok(p.x >= 0 && p.x + p.w <= PAGE_WIDTH && p.y >= 0 && p.y + p.h <= H, `${w}x${h}: a panel inside the page`);
      assert.ok(p.h >= 360, `${w}x${h}: a panel ${p.h.toFixed(0)} units tall`);
    }
    for (const c of Object.values(L.captions)) assert.ok(c.y >= 0 && c.y + c.h <= H, `${w}x${h}: a caption inside the page`);
    assert.ok(L.captions.purpose.y + L.captions.purpose.h <= L.panels[0].y, `${w}x${h}: the caption above the panels`);
  }
});

test('the Doctor\'s pilot: its own device in the opener, and the Hospital panel lights the player\'s own number only', () => {
  const opener = doctor(1200).svg;
  assert.ok(opener.includes(DEVICE_FILES.Doctor), 'the injector (the role card\'s device) in the opener');
  for (const role of CURRENT_ROLES.filter(r => r !== 'Doctor')) assert.ok(!opener.includes(DEVICE_FILES[role]), `no ${role} device`);
  const at = seat => doctor(5300, { seat }).svg;
  assert.notEqual(at(6), at(3), 'the readout shows the player\'s own number');
  assert.equal(at(null), at(0), 'without a valid number nothing is lit');
  const lit = svg => (svg.match(/fill="#F2C14E" opacity="1"/g) ?? []).length;
  assert.ok(lit(at(6)) > lit(at(null)), 'a number lights its segments and its key');
});

test('the motion bible\'s role reveal entry carries the films', () => {
  const scene = CATALOGUE.find(s => s.id === 'role-reveal');
  assert.match(scene.beats.start, /seven-second film/);
  assert.match(scene.durations.full, /7000 ms, the same length and beats for every role/);
  assert.match(scene.audio, /silent/);
  assert.ok(scene.assets.some(a => a.startsWith('design/cinematic/pilots/role-reveal/')));
});
