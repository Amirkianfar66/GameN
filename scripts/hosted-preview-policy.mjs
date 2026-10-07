export function createHostedPreviewCsp(projectId) {
  const functionsOrigin = `https://us-central1-${projectId}.cloudfunctions.net`;
  return [
    "default-src 'none'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'none'",
    "script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self'",
    `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://content-firebaseappcheck.googleapis.com https://recaptchaenterprise.googleapis.com https://www.google.com ${functionsOrigin}`,
    'frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
  ].join('; ');
}
