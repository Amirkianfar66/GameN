// mothership:dev-only
//
// One picture of one page under design/, for looking at work in progress:
//   node design/tools/shot.mjs /prototypes/view.html?src=/source/token/token-neutral.svg out.png 600 400 2
//
// Arguments: path under design/, output file, viewport width, viewport height, scale.
// Options:   --reduced-motion   emulate the device setting
//            --selector=<css>   capture one element
//            --viewport         capture the first screenful only
//            --fit              grow the viewport to the page's height first

import { resolve } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const args = process.argv.slice(2);
const flags = args.filter(arg => arg.startsWith('--'));
const [path, out, width = '800', height = '600', scale = '1'] = args.filter(arg => !arg.startsWith('--'));
if (!path || !out) {
  console.error('Usage: node design/tools/shot.mjs <path-under-design> <out.png> [width] [height] [scale] [--reduced-motion] [--selector=css]');
  process.exit(2);
}
const selector = flags.find(flag => flag.startsWith('--selector='))?.slice('--selector='.length) ?? null;

const server = await startStaticServer();
const chrome = await launchBrowser();
try {
  const browser = await connect(chrome.endpoint);
  const page = await openPage(browser, { width: Number(width), height: Number(height), scale: Number(scale) });
  if (flags.includes('--reduced-motion')) await page.media({ 'prefers-reduced-motion': 'reduce' });
  await page.goto(server.origin + path);
  if (flags.includes('--fit')) await page.fitHeight();
  const size = await page.screenshot(resolve(out), { selector, viewport: flags.includes('--viewport'), keepScroll: flags.includes('--keep-scroll') });
  for (const problem of page.problems()) console.error(`page problem: ${problem}`);
  console.log(`${out} ${size.width}x${size.height}`);
  browser.close();
} finally {
  await chrome.close();
  await server.close();
}
