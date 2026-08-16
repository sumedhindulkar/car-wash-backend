import servicesData from '../services.json';
import { connectDatabase } from '../src/config/database';
import { IService, Service } from '../src/models/service.model';
import mongoose from 'mongoose';

type SeedService = Omit<IService, 'createdAt' | 'updatedAt'>;

async function seedServices(): Promise<void> {
  await connectDatabase();

  const services = servicesData as SeedService[];
  let upsertedCount = 0;

  for (const service of services) {
    const result = await Service.findOneAndUpdate(
      {
        vehicleType: service.vehicleType,
        category: service.category,
      },
      { $set: service },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    upsertedCount += 1;
    console.log(`Upserted service: ${result?.title} (${result?._id})`);
  }

  console.log(`Seed complete. Upserted ${upsertedCount} services.`);
}

seedServices()
  .catch((error: unknown) => {
    console.error('Failed to seed services', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
