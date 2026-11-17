globalThis[Symbol.for('mothership:dev-only')]=true;

import {writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createFoodApplySignal, startFoodTrialBridge} from './bridge.mjs';

function argument(name) {
  const prefix = '--' + name + '=';
  const value = process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw Error('Pass ' + prefix + 'PATH');
  return resolve(value);
}

const driver = argument('driver'), bundle = argument('bundle'), artwork = argument('artwork'), links = argument('links');
const signal = createFoodApplySignal();
const {prepareFoodTrial} = await import(pathToFileURL(driver).href);
const lab = await prepareFoodTrial({onEvent: signal.observe});
const closing = new AbortController();
let bridge, stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  closing.abort();
  process.stdin.pause();
  try { await bridge?.close(); } finally { await lab.close?.(); }
}
try {
  bridge = await startFoodTrialBridge({...lab, applySignal: signal, bundle, artwork});
  await writeFile(links, JSON.stringify({origin: bridge.origin, variant: lab.variant ?? null,
    backendSource: lab.backendSource ?? null, urls: bridge.urls}, null, 2) + '\n',
    {mode: 0o600, flag: 'wx'});
  process.once('SIGINT', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
  console.log('Loopback Food trial ready at ' + bridge.origin + '. Actor links are in ' + links);
  if (lab.startTrial) {
    console.log('Open both phone pages, then press Enter in this terminal once to start the real-time interval.');
    process.stdin.resume();
    await once(process.stdin, 'data', {signal: closing.signal});
    process.stdin.pause();
    await bridge.start();
    console.log('Food trial clock started.');
  }
} catch (error) {
  const cancelled = stopping && error.name === 'AbortError';
  await close();
  if (!cancelled) throw error;
}
