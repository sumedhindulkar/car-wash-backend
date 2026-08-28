import mongoose, { ClientSession } from 'mongoose';

/**
 * Runs the handler inside a MongoDB transaction so multi-document writes
 * (subscription + all of its bookings) either all commit or all roll back.
 */
export async function runInTransaction<T>(
  handler: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(() => handler(session));
  } finally {
    await session.endSession();
  }
}
