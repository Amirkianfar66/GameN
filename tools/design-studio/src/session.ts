import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken, type AppCheck } from 'firebase/app-check';

export const base = '/development/design-studio/';
let auth: Auth;
let appCheck: AppCheck;
let preview = false;
export async function initializeSession() {
  // This opt-in exists only in Vite's development build; production cannot enable it.
  preview = import.meta.env.DEV && import.meta.env.VITE_STUDIO_LOCAL_PREVIEW === '1';
  if (preview) return null;
  const response = await fetch('/preview-config.json', { cache: 'no-store' });
  if (!response.ok) throw Error('Studio connection settings are unavailable. Please reload.');
  const config = await response.json();
  // Separate named app and persistence key: designer sign-in cannot replace a player's seat identity.
  const app = initializeApp(config, 'gamen-design-studio');
  appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.recaptchaEnterpriseSiteKey), isTokenAutoRefreshEnabled: true });
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
  return auth;
}
export async function api(path: string, method = 'GET', data?: unknown) {
  if (!preview && !auth?.currentUser) throw Error('Sign in to your designer account.');
  const headers: Record<string, string> = {};
  if (!preview) {
    headers.Authorization = 'Bearer ' + await auth.currentUser!.getIdToken();
    headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token;
  }
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path.replace(/^\/api\/?/, 'api/'), {
    method, headers, cache: 'no-store', body: data === undefined ? undefined : JSON.stringify(data),
  });
  const value = await response.json().catch(() => ({ error: 'Studio storage is temporarily unavailable.' }));
  if (!response.ok) throw Error(value.error || 'Studio request failed.');
  return value;
}
export function storageKey(key: string) {
  return 'gamen-studio:' + (preview ? 'local-preview' : auth.currentUser!.uid) + ':' + key;
}
