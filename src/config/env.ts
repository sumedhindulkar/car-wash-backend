import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  mongodbUri: requireEnv('MONGODB_URI'),
  firebaseProjectId: isProduction
    ? requireEnv('FIREBASE_PROJECT_ID')
    : process.env.FIREBASE_PROJECT_ID,
} as const;
