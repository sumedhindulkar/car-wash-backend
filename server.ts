import { env } from './src/config/env';
import { connectDatabase } from './src/config/database';
import { app } from './src/app';

async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
