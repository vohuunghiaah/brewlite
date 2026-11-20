import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database';
import { Product } from './products/entities/product.entity';
import { seedProducts } from './products/products.seed';

async function prepare() {
  const action = process.argv[2];
  if (action !== 'migrate' && action !== 'seed') throw new Error('Expected migrate or seed');
  if (action === 'seed' && !['development', 'test'].includes(process.env.NODE_ENV ?? 'development')) {
    throw new Error('Sample products require a development or test environment.');
  }
  const source = await new DataSource({ ...databaseOptions(), entities: [Product] }).initialize();
  try {
    if (action === 'migrate') {
      const applied = await source.runMigrations();
      console.log(`Applied ${applied.length} migration(s).`, applied.map(m => m.name));
    } else {
      await seedProducts(source);
    }
  } finally {
    await source.destroy();
  }
}

void prepare().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
