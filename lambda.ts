import serverless from 'serverless-http';
import { app } from './src/app';
import { connectDatabase } from './src/config/database';

let dbInitialized = false;

const initializeDatabase = async () => {
  if (!dbInitialized) {
    await connectDatabase();
    dbInitialized = true;
  }
};

export const handler = async (event: any, context: any) => {
  await initializeDatabase();

  return serverless(app)(event, context);
};
