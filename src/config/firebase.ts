import { getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { env } from './env';

export function getFirebaseAuth(): Auth {
  if (getApps().length === 0) {
    const projectId = env.firebaseProjectId;

    if (!projectId) {
      throw new Error('Missing required environment variable: FIREBASE_PROJECT_ID');
    }

    initializeApp({ projectId });
  }

  return getAuth();
}
