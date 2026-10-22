/** Public build configuration. Auth credentials and App Check tokens never belong here. */
export interface HostedConfiguration {
  readonly projectId: string;
  readonly apiKey: string;
  readonly appId: string;
  readonly messagingSenderId: string;
  readonly authDomain: string;
  readonly pageOrigin: string;
  readonly recaptchaEnterpriseSiteKey: string;
}

const fields = ['projectId', 'apiKey', 'appId', 'messagingSenderId', 'authDomain', 'pageOrigin', 'recaptchaEnterpriseSiteKey'] as const;

/** Reject a mixed project or a config containing credentials before any SDK is initialized. */
export function readHostedConfiguration(input: unknown): HostedConfiguration {
  const invalid = (): never => { throw new TypeError('Invalid hosted preview configuration'); };
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(descriptors).length !== fields.length) return invalid();
  for (const field of fields) {
    const descriptor = descriptors[field];
    if (descriptor === undefined || !('value' in descriptor) || typeof descriptor.value !== 'string') return invalid();
  }
  const config = Object.fromEntries(fields.map(field => [field, descriptors[field]!.value])) as unknown as HostedConfiguration;
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId) || config.projectId.startsWith('demo-')) return invalid();
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(config.apiKey)
    || !/^[0-9]{6,20}$/.test(config.messagingSenderId)
    || !new RegExp(`^1:${config.messagingSenderId}:web:[a-zA-Z0-9]+$`).test(config.appId)
    || !/^[A-Za-z0-9_-]{20,128}$/.test(config.recaptchaEnterpriseSiteKey)) return invalid();
  if (config.authDomain !== `${config.projectId}.firebaseapp.com`
    || config.pageOrigin !== `https://${config.projectId}.web.app`) return invalid();
  return Object.freeze(config);
}

export function hostedFunctionsOrigin(config: HostedConfiguration): string {
  return `https://us-central1-${config.projectId}.cloudfunctions.net`;
}
