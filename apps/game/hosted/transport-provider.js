import { createHostedTransport } from '../dist/browser/hosted-transport.js';
export async function createTransport() {
  const response = await fetch('/preview-config.json', { cache: 'no-store', redirect: 'error', credentials: 'omit' });
  if (!response.ok) throw new Error('Hosted preview configuration is unavailable');
  return createHostedTransport(await response.json());
}
