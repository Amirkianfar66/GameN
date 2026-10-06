import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PlayerPresentationEventSchema, PlayerViewSchema, PublicPresentationEventSchema, PublicViewSchema } from '@mothership/contracts';
import { proposedDesignTokens } from '@mothership/design-tokens';
import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { GALLERY_MATCH_ID, playerView, publicView, runSpecimen, SPECIMENS } from '../dev/harness/gallery-specimens.js';
import { createFakeHost } from './support/fakes.mjs';

// The motion gallery's scenes, run without a browser against the real client core. What a
// scene looks like is for a browser; what it feeds the client, and which cues the director
// makes of it, is checked here.
//
// SYNTHETIC SCENES. They are authored for looking at motion and prove nothing about a
// backend, a rule or a device.

/** Plays one specimen to its end on a scripted clock and records everything that crossed the transport and every frame. */
async function play(specimen, { stopAt = null } = {}) {
  const host = createFakeHost({ localStart: 0 });
  const wait = ms => new Promise(resolve => host.ports.scheduler.setTimeout(resolve, ms));
  const record = { views: [], events: [], frames: [], overlays: 0 };
  const run = runSpecimen({
    specimen,
    wait,
    now: () => host.localNow(),
    overlay: () => { record.overlays += 1; },
    createScreen({ transport, matchId }) {
      const tapped = {
        ...transport,
        subscribe: listener => transport.subscribe({
          onConnectionChange: state => listener.onConnectionChange(state),
          onPayload: payload => { record.views.push(structuredClone(payload)); listener.onPayload(payload); },
          onEventPayload: payload => { record.events.push(structuredClone(payload)); listener.onEventPayload(payload); },
        }),
      };
      const create = specimen.surface === 'player' ? createPlayerScreen : createTableScreen;
      return create({ transport: tapped, matchId, ports: host.ports, host: { reload() {} } });
    },
  });
  run.screen.subscribe(() => record.frames.push(run.screen.getFrame()));
  if (stopAt !== null) {
    await host.advance(stopAt);
    run.stop();
  }
  await host.advance(8_000);
  const numbered = new Map(record.frames.flatMap(frame => [...frame.cues.map(item => [item.seq, ['public', item.cue.kind]]), ...frame.privateCues.map(item => [item.seq, ['private', item.cue.kind]])]));
  return { ...record, run, host, cues: [...numbered].sort((a, b) => a[0] - b[0]).map(([, cue]) => cue), last: () => run.screen.getFrame() };
}
const card = frame => frame.model.match?.privateArea.content?.actions.cards[0] ?? null;

test('the gallery’s synthetic match satisfies the shared contract, and is not the contract fixture', () => {
  assert.deepEqual(PublicViewSchema.parse(publicView()), publicView());
  assert.deepEqual(PlayerViewSchema.parse(playerView()), playerView());
  assert.equal(GALLERY_MATCH_ID, publicView().matchId);
  assert.doesNotMatch(JSON.stringify([publicView(), playerView()]), /fixture-match|fixture-command|serverOnly|protection/i);
  // Each call is a fresh copy: a scene cannot change what the next one starts from.
  assert.notEqual(publicView(), publicView());
});

test('the specimens are the ones the motion direction asks for first, each labeled for what it is', () => {
  assert.deepEqual(SPECIMENS.map(specimen => [specimen.id, specimen.status]), [
    ['card-selection', 'interaction'],
    ['registration', 'connected'],
    ['public-move', 'connected'],
    ['status-change', 'connected'],
    ['phase-change', 'connected'],
    ['round-transition', 'connected'],
    ['resolved-shot', 'not-connected'],
    ['blocked-outcome', 'not-connected'],
  ]);
  for (const specimen of SPECIMENS) {
    for (const field of ['title', 'level', 'treatment', 'limit', 'words', 'lookAt']) assert.equal(typeof specimen[field] === 'string' && specimen[field].length > 0, true, `${specimen.id}.${field}`);
    assert.equal(typeof proposedDesignTokens.motionMs[specimen.token], 'number', `${specimen.id}: its duration is a token`);
    assert.equal(specimen.status === 'not-connected', specimen.overlay !== undefined, `${specimen.id}: only a not-connected specimen is drawn by the gallery itself`);
  }
  const notConnected = SPECIMENS.filter(specimen => specimen.status === 'not-connected');
  assert.match(notConnected[0].limit, /^NOT CONNECTED\. No approved public fact/);
  assert.match(notConnected[1].limit, /^FIXTURE ONLY\. .*undecided \(RULE-003\)/);
  for (const specimen of notConnected) assert.match(specimen.words, /^Nothing\./);
});

test('every scene feeds the client contract-valid views and events for its own audience', async () => {
  for (const specimen of SPECIMENS) {
    const { views, events } = await play(specimen);
    const [viewSchema, eventSchema] = specimen.surface === 'player' ? [PlayerViewSchema, PlayerPresentationEventSchema] : [PublicViewSchema, PublicPresentationEventSchema];
    assert.equal(views.length >= 1, true, specimen.id);
    for (const view of views) assert.deepEqual(viewSchema.parse(view), view, specimen.id);
    for (const event of events) {
      assert.deepEqual(eventSchema.parse(event), event, specimen.id);
      assert.equal(views.some(view => view.viewRevision === event.viewRevision), true, `${specimen.id}: an event names a view the scene delivered`);
    }
  }
});

test('a connected specimen shows a cue the real director issued for a contract event, and exactly the one it names', async () => {
  for (const specimen of SPECIMENS.filter(candidate => candidate.status === 'connected')) {
    const { cues, events, overlays, last } = await play(specimen);
    assert.deepEqual(cues.map(([, kind]) => kind), specimen.expectedCues, specimen.id);
    assert.equal(events.length, 1, `${specimen.id}: one event is behind it`);
    assert.equal(overlays, 0, `${specimen.id}: the gallery draws nothing itself`);
    assert.equal(last().model.banners.some(banner => banner.variant === 'fixture'), true, `${specimen.id}: labeled as synthetic on screen`);
  }
});

test('the registration specimen is a private cue only, on a card that says “Registered”', async () => {
  const { cues, frames, last } = await play(SPECIMENS.find(specimen => specimen.id === 'registration'));
  assert.deepEqual(cues, [['private', 'registration']]);
  for (const frame of frames) assert.deepEqual(frame.cues, [], 'Never a public cue, in any frame');
  assert.equal(card(last()).status, 'registered');
  assert.match(last().privateAnnouncement.text, /registered/i);
});

test('the card-selection specimen is the player’s own input and involves no event and no cue', async () => {
  const { cues, events, frames, overlays, last } = await play(SPECIMENS.find(specimen => specimen.id === 'card-selection'));
  assert.deepEqual([cues, events, overlays], [[], [], 0]);
  assert.equal(frames.some(frame => card(frame)?.selected === true), true, 'The card was picked up');
  assert.equal(card(last()).selected, false, 'and put down again');
});

test('a not-connected specimen sends the client no event and gets no cue: only the gallery draws it', async () => {
  for (const specimen of SPECIMENS.filter(candidate => candidate.status === 'not-connected')) {
    const { cues, events, views, overlays, frames } = await play(specimen);
    assert.deepEqual([cues, events], [[], []], specimen.id);
    assert.equal(views.length, 1, `${specimen.id}: the view never changes, so the screen states no fact`);
    assert.equal(overlays, 1, specimen.id);
    // Nothing of the treatment, and no changed status, is in anything the client was given or made.
    for (const frame of frames) assert.doesNotMatch(JSON.stringify(frame), /BANG|BLOCKED|Injured|Eliminated/, specimen.id);
  }
});

test('a scene that is stopped does nothing more', async () => {
  const selection = await play(SPECIMENS.find(specimen => specimen.id === 'card-selection'), { stopAt: 100 });
  assert.equal(selection.frames.some(frame => card(frame)?.selected === true), false);
  const shot = await play(SPECIMENS.find(specimen => specimen.id === 'resolved-shot'), { stopAt: 100 });
  assert.equal(shot.overlays, 0);
  const move = await play(SPECIMENS.find(specimen => specimen.id === 'public-move'), { stopAt: 100 });
  assert.deepEqual([move.cues, move.events], [[], []]);
});

test('the turn clock keeps running through a scene: a second per second, cue or no cue', async () => {
  const { frames, last } = await play(SPECIMENS.find(specimen => specimen.id === 'round-transition'));
  assert.equal(frames.some(frame => frame.cues.length > 0), true);
  // Eight seconds of scene on a sixty-second turn.
  assert.equal(last().model.match.phase.timer.display, '0:52');
});

// The lettering and the shapes of the two not-connected treatments exist in the gallery's
// own files and nowhere a production bundle is made from.
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name));
}

test('no shipped source or stylesheet knows an impact, a block or their lettering', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const shipped = [
    ...sources(join(root, 'apps/game/src')), ...sources(join(root, 'apps/game/dist')),
    ...sources(join(root, 'packages/presentation/src')), ...sources(join(root, 'packages/presentation/dist')),
  ].filter(file => /\.(ts|js|css|json)$/.test(file));
  assert.equal(shipped.length > 40, true);
  for (const file of shipped) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /BANG|gallery-|data-kind="(impact|shield)"|motion-impact|publicImpact(?!\b[^\n]*deliberately)/, file);
    assert.doesNotMatch(text, /\bBLOCKED\b|\bimpact lettering\b/, file);
  }
  const gallery = readFileSync(new URL('../dev/harness/gallery-specimens.js', import.meta.url), 'utf8');
  assert.match(gallery, /lettering: 'BANG!'/);
  assert.match(gallery, /lettering: 'BLOCKED'/);
});
