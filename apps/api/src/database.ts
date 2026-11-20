import { DataSourceOptions } from 'typeorm';
import { CreateOrderCatalog1731888000000 } from './migrations/1731888000000-create-order-catalog';
import { AddCustomizationAndNoteToOrderItems1731974400000 } from './migrations/1731974400000-AddCustomizationAndNoteToOrderItems';
import { AddAccountAuthentication1732060800000 } from './migrations/1732060800000-add-account-authentication';
import { AddPaymentsAndStockOcc1732147200000 } from './migrations/1732147200000-add-payments-and-stock-occ';

export const migrations = [
  CreateOrderCatalog1731888000000,
  AddCustomizationAndNoteToOrderItems1731974400000,
  AddAccountAuthentication1732060800000,
  AddPaymentsAndStockOcc1732147200000,
];

export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    // Complete pool acquisition within the five-second external readiness budget (NFR-07).
    connectTimeoutMS: 2000,
    synchronize: false,
    migrations,
  };
}
