// The phone pack beside Frontend's build (design/tools/phone-ui-native-compare.mjs): its catalog of
// parts and its review page, checked without a browser. Drawing the pairs needs a built harness and
// Chromium, so that is run by hand (docs/design/phone-ui-native-compare.md).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PARTS, STAGES, buildAddress, catalogProblems } from '../../../design/tools/lib/phone-ui-native-parts.mjs';
import { dayName, designAddress, pageHtml, parseArgs, readFindings, selectParts } from '../../../design/tools/phone-ui-native-compare.mjs';
import { SHEETS, SIZES } from '../../../design/phone-ui/sheets/catalog.mjs';
import { screenRegistry } from '../../../design/phone-ui/prototype/screens.mjs';

test('every part names a sheet, a screen and a phone size the pack has', () => {
  const problems = catalogProblems(PARTS, { sheets: new Set(SHEETS.map(sheet => sheet.id)), screens: new Set(Object.keys(screenRegistry())), sizes: new Set(Object.keys(SIZES)) });
  assert.deepEqual(problems, []);
});

test('the parts cover a match from the menu to the end, with the findings of 11 November 2026', () => {
  assert.equal(PARTS.length, 49);
  assert.deepEqual([...new Set(PARTS.map(part => part.stage))], STAGES.map(stage => stage.id));
  const count = verdict => PARTS.filter(part => part.was.verdict === verdict).length;
  assert.deepEqual([count('same'), count('close'), count('differs')], [4, 8, 37]);
  assert.ok(PARTS.every(part => part.was.date === '2026-11-11' && part.was.note.length > 20));
  assert.deepEqual(PARTS.filter(part => part.build === null).map(part => part.id), ['boarding']);
});

test('a broken entry is named, not drawn', () => {
  const broken = { ...PARTS[0], id: 'Bad id', stage: 'nowhere', sheet: '99', design: 'x=1', view: { size: '1x1', text: 3 }, was: { verdict: 'fine', note: '' }, build: { scenario: 'board', steps: [['jump', 'x'], ['wait', 'soon'], ['tapText', '(']] } };
  const problems = catalogProblems([broken, PARTS[1], PARTS[1]], { sheets: new Set(['10']), screens: new Set(['menu']), sizes: new Set(['390x844']) });
  for (const words of ['lower-case', 'no stage nowhere', 'no sheet 99', 'names no screen', 'no phone size 1x1', 'text is 1, 1.5 or 2', 'same, close or differs', 'unknown step jump', 'needs a number', 'is not a pattern', 'listed twice']) {
    assert.ok(problems.some(problem => problem.includes(words)), words);
  }
});

test('the pack is drawn with its review frame, the build with its harness scenario', () => {
  const large = PARTS.find(part => part.id === 'largest-text');
  assert.equal(designAddress(large), '/design/phone-ui/prototype/index.html?s=result&outcome=PLAYER_JAILED&safe=20%2C0&text=2');
  assert.equal(designAddress(PARTS.find(part => part.id === 'menu')), '/design/phone-ui/prototype/index.html?s=menu&safe=47%2C34');
  assert.equal(buildAddress({ scenario: 'reading', params: 'flow=3&elapsed=4000' }), '/?scenario=reading&count=9&tuple=phone&flow=3&elapsed=4000');
  assert.equal(buildAddress({ scenario: 'vote' }, 7), '/?scenario=vote&count=7&tuple=phone');
});

test('a run draws the parts named, one stage, or all; unknown names are refused', () => {
  assert.deepEqual(selectParts(parseArgs(['--only', 'menu,end'])).map(part => part.id), ['menu', 'end']);
  assert.equal(selectParts(parseArgs(['--stage', 'votes'])).length, 7);
  assert.equal(selectParts(parseArgs([])).length, 49);
  assert.throws(() => selectParts(parseArgs(['--only', 'nope'])), /No part nope/);
  assert.throws(() => selectParts(parseArgs(['--stage', 'nope'])), /No stage nope/);
  assert.throws(() => parseArgs(['--count', '6']), /7, 8 or 9/);
});

test('findings from a later review are checked before they are shown', () => {
  assert.equal(readFindings('{"date":"2026-11-20","parts":{"menu":{"verdict":"same"}}}').parts.menu.verdict, 'same');
  assert.throws(() => readFindings('{"date":"2026-11-20","parts":{"menu":{"verdict":"fine"}}}'), /same, close or differs/);
  assert.throws(() => readFindings('{"parts":{}}'), /date/);
  assert.equal(dayName('2026-11-11'), '11 November 2026');
  assert.equal(dayName('after the fix'), 'after the fix');
});

test('the review page shows every pair, escapes what it prints and loads nothing from elsewhere', () => {
  const parts = PARTS.slice(0, 3).map(part => ({
    ...part,
    pack: { address: designAddress(part), image: `img/${part.id}-pack.jpg`, width: 585, height: 1266, problems: [] },
    build: { address: buildAddress(part.build), steps: [], image: null, reason: 'Not drawn', error: 'Nothing <b>visible</b>', problems: ['HTTP 404: /x.png'] },
    now: null,
  }));
  parts[0].now = { verdict: 'close', note: 'Better <now>' };
  const html = pageHtml({ parts, pack: { commit: 'abc1234', dirty: false }, build: { head: 'def5678', dirty: true }, view: 'Drawn for a test', findingsDate: '2026-11-20' });
  for (const part of parts) assert.match(html, new RegExp(`id="${part.id}"`));
  assert.match(html, /Better &lt;now&gt;/);
  assert.match(html, /Nothing &lt;b&gt;visible&lt;\/b&gt;/);
  assert.match(html, /20 November 2026/);
  assert.match(html, /11 November 2026/);
  assert.match(html, /with uncommitted changes/);
  assert.match(html, /HTTP 404: \/x\.png/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|https?:\/\//);
});
