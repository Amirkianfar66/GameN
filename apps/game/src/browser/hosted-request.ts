import { V1_OPERATIONS } from '../connected/transport.js';
import type { V1Operation } from '../connected/transport.js';
import { hostedFunctionsOrigin, readHostedConfiguration } from './hosted-config.js';
import type { HostedConfiguration } from './hosted-config.js';

export interface HostedRequestPorts {
  getIdToken(): Promise<string>;
  getAppCheckToken(): Promise<string>;
  readonly fetch: typeof globalThis.fetch;
}

/** Plain JSON HTTP, with current Auth and App Check proof. Never follows a redirect. */
export async function postHostedOperation(config: HostedConfiguration, ports: HostedRequestPorts, operation: V1Operation, body: unknown): Promise<unknown> {
  const pinned = readHostedConfiguration(config);
  if (!V1_OPERATIONS.includes(operation)) throw new TypeError('Not a documented operation');
  const [idToken, appCheckToken] = await Promise.all([ports.getIdToken(), ports.getAppCheckToken()]);
  if (idToken.length === 0 || appCheckToken.length === 0) throw new Error('Identity verification unavailable');
  const response = await ports.fetch(`${hostedFunctionsOrigin(pinned)}/${operation}`, {
    method: 'POST', cache: 'no-store', redirect: 'error', credentials: 'omit',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}`, 'X-Firebase-AppCheck': appCheckToken },
    body: JSON.stringify(body),
  });
  return JSON.parse(await response.text()) as unknown;
}
