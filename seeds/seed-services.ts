import servicesData from '../services.json';
import { connectDatabase } from '../src/config/database';
import { Service } from '../src/models/service.model';
import mongoose from 'mongoose';

type SeedService = {
  id: string;
  title: string;
  vehicleType: string;
  category: string;
  description: string;
  bannerImage: string;
  image: string;
  active: boolean;
  items: Array<Record<string, unknown>>;
};

async function seedServices(): Promise<void> {
  await connectDatabase();

  const services = servicesData as SeedService[];
  let upsertedCount = 0;

  for (const service of services) {
    const { id, ...fields } = service;

    await Service.findByIdAndUpdate(
      id,
      {
        _id: id,
        ...fields,
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    upsertedCount += 1;
    console.log(`Upserted service: ${id}`);
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
