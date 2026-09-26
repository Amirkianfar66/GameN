// Chosen service boundary. No projects, credentials, Security Rules or deployment.
export const firebaseDirection = {
  status: 'bootstrap-placeholder',
  authentication: 'Firebase Auth',
  commands: 'Cloud Functions for Firebase, second generation',
  persistence: 'Firestore',
  deadlines: 'Cloud Tasks with a durable outbox',
  nextTask: 2,
} as const;
