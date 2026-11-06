// mothership:dev-only
//
// The inventory's before/after contact sheet: for each source family, the picture the runtime
// baseline (origin/main) holds next to the Designer's current picture, each labelled with its
// path, head and SHA-256, so newer art cannot silently disappear during integration:
//   node design/tools/cinematic-contact.mjs
//
// Reads the pictures from git objects (no checkout changes) and lays them out on a page in a
// local Chromium. Writes design/cinematic/inventory/contact-before-after.png and
// design/cinematic/inventory/contact-before-after.json (the pairs and their hashes).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const MAIN = 'db65bb87f05983ff6861d27689ba1b7bab55d051';
const BOARD = '98ccb984ee6213147eca16fe2748148eb4ddfd0d';
const ABILITIES = '27be8749b51775fee3a0d81b62a3cdabedafe1be';
const NONE = null;
// [family, before on main (or NONE), after: [head, path, head label]]
const PAIRS = [
  ['Board, rooms and crew', 'docs/frontend/evidence/board-play/simulation/390x844-board.png', [BOARD, 'design/board-v2/review/board-390x844-ward.png', '#161 stack']],
  ['Hospital: four berths and drone rescue', 'design/board-motion/review/states/board.crowded-hospital.png', [BOARD, 'design/board-v2/review/four-390x844-rescue-2600.png', '#160']],
  ['Hospital: critical and flatline', NONE, [BOARD, 'design/board-v2/review/medical-390x844-flatline-2000.png', '#158']],
  ['Overflow and off-board plaque', NONE, [BOARD, 'design/board-v2/review/four-390x844-overflow-0700.png', '#160']],
  ['Captain RELEASE and EJECT', 'design/board-motion/review/states/release.vote-yes.png', [BOARD, 'design/board-v2/review/captain-390x844-eject-3500.png', '#159']],
  ['Private Talk capsule', 'docs/frontend/evidence/board-play/emulator/emulator-06-hack-choose.png', [BOARD, 'design/board-v2/review/capsule-390x844-result-2400.png', '#144']],
  ['Blackout', NONE, [BOARD, 'design/board-v2/review/blackout-390x844-8000-dark.png', '#129']],
  ['ATTACK BLOCKED', NONE, [BOARD, 'design/board-v2/review/blocked-390x844-0280-bubble.png', '#130']],
  ['Phantom Clone', NONE, [BOARD, 'design/board-v2/review/clone-390x844-activate-1900.png', '#161']],
  ['Ability dossier', 'design/abilities/review/contact-rescue-disable-supply.png', [ABILITIES, 'design/abilities/review/contact-rescue-disable-supply.png', '#116 chain']],
  ['Setup: character choice and role card', NONE, [ABILITIES, 'design/abilities/review/contact-setup.png', '#116']],
  ['Phone kit and clothing', 'design/phone-kit/review/contact-clothes.png', [BOARD, 'design/phone-kit/review/contact-clothes.png', '#127']],
];

const blob = (ref, path) => {
  try { return execFileSync('git', ['-C', repoRoot, 'show', `${ref}:${path}`], { maxBuffer: 1 << 28 }); } catch { return null; }
};
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const dir = await mkdtemp(join(tmpdir(), 'cinematic-contact-'));
try {
  const rows = [];
  for (const [index, [family, before, [ref, path, label]]] of PAIRS.entries()) {
    const after = blob(ref, path);
    if (!after) throw new Error(`Missing ${path} at ${ref}`);
    await writeFile(join(dir, `a${index}.png`), after);
    const row = { family, after: { path, head: label, commit: ref, sha256: sha(after) }, before: null };
    if (before) {
      const data = blob(MAIN, before);
      if (!data) throw new Error(`Missing ${before} on main`);
      await writeFile(join(dir, `b${index}.png`), data);
      row.before = { path: before, commit: MAIN, sha256: sha(data), identicalToAfter: sha(data) === row.after.sha256 };
    }
    rows.push(row);
  }
  const cell = (file, meta, empty) => meta
    ? `<figure><img src="${file}"><figcaption>${esc(meta.path)}<br>${esc(meta.head ?? 'origin/main db65bb8')} · sha256 ${meta.sha256.slice(0, 16)}</figcaption></figure>`
    : `<figure class="none"><div>${esc(empty)}</div></figure>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#10141c;color:#e9e1cf;font:14px/1.35 system-ui,sans-serif;width:1240px}
    h1{font-size:22px;margin:0 0 4px} p{margin:0 0 16px;color:#b8b0a0}
    .row{display:grid;grid-template-columns:200px 1fr 1fr;gap:16px;align-items:start;border-top:1px solid #2c3442;padding:14px 0}
    .fam{font-weight:700;font-size:16px;color:#f2c14e} figure{margin:0} img{max-width:100%;max-height:420px;display:block;border:1px solid #3a4456;background:#000}
    figcaption{font:11px/1.3 ui-monospace,monospace;color:#9aa3b2;margin-top:4px;word-break:break-all}
    .none div{height:120px;display:flex;align-items:center;justify-content:center;border:1px dashed #3a4456;color:#7d8696;text-align:center;padding:8px}
    .head{display:grid;grid-template-columns:200px 1fr 1fr;gap:16px;font-weight:700;color:#cfd6e2}
  </style><h1>Designer source families: runtime baseline vs Designer current</h1>
  <p>Before: origin/main db65bb8 (runtime baseline, #171). After: the Designer's current review picture on its open PR head. Generated by design/tools/cinematic-contact.mjs from git objects.</p>
  <div class="head"><div>Family</div><div>Before: on origin/main</div><div>After: Designer current</div></div>
  ${rows.map((row, i) => `<div class="row"><div class="fam">${esc(row.family)}</div>${cell(`b${i}.png`, row.before, 'No runtime picture of this family on main (its runtime port may exist: see inventory.json)')}${cell(`a${i}.png`, row.after)}</div>`).join('')}`;
  await writeFile(join(dir, 'index.html'), html);
  const handle = await launchBrowser();
  try {
    const browser = await connect(handle.endpoint);
    const page = await openPage(browser, { width: 1288, height: 900 });
    await page.goto(pathToFileURL(join(dir, 'index.html')).href, 'document.readyState === "complete" && [...document.images].every(i => i.complete)');
    const out = resolve(repoRoot, 'design/cinematic/inventory/contact-before-after.png');
    await page.screenshot(out);
    await writeFile(resolve(repoRoot, 'design/cinematic/inventory/contact-before-after.json'), JSON.stringify({ generatedBy: 'design/tools/cinematic-contact.mjs', main: MAIN, rows }, null, 1) + '\n');
    console.log(`${rows.length} families -> ${out}`);
    browser.close();
  } finally {
    await handle.close();
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
