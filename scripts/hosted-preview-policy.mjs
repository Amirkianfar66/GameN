export function createHostedPreviewCsp(projectId) {
  const functionsOrigin = `https://us-central1-${projectId}.cloudfunctions.net`;
  return [
    "default-src 'none'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'none'",
    "script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'", "media-src 'self'",
    `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://content-firebaseappcheck.googleapis.com https://recaptchaenterprise.googleapis.com https://www.google.com ${functionsOrigin}`,
    'frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
  ].join('; ');
}

/** The exact header block used by Hosting and production-equivalent visual previews. */
export function createHostedPreviewHeaders(projectId) {
  return Object.freeze([
    {key: 'Cache-Control', value: 'no-store'},
    {key: 'Content-Security-Policy', value: createHostedPreviewCsp(projectId)},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'X-Frame-Options', value: 'DENY'},
    {key: 'Referrer-Policy', value: 'no-referrer'},
    {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
  ].map(Object.freeze));
}

export function applyHostedPreviewHeaders(response, projectId) {
  for (const {key, value} of createHostedPreviewHeaders(projectId)) response.setHeader(key, value);
}

/**
 * Connected local journeys need loopback API/Auth origins. Only connect-src differs;
 * these headers must be reported as emulator evidence, never exact production evidence.
 */
export function createEmulatorPreviewHeaders(projectId, origins) {
  if (!Array.isArray(origins) || !origins.length) throw Error('Explicit emulator origins required');
  const local = [...new Set(origins.map(origin => {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.username || url.password || !url.port || url.origin !== origin)
      throw Error('Only exact HTTP loopback emulator origins are allowed');
    return origin;
  }))].sort();
  return Object.freeze(createHostedPreviewHeaders(projectId).map(header => header.key !== 'Content-Security-Policy' ? header
    : Object.freeze({...header, value: header.value.split('; ').map(directive => directive.startsWith('connect-src ')
      ? `${directive} ${local.join(' ')}` : directive).join('; ')})));
}
