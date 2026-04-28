import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const client = createClient({
      url: env.databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    instance = drizzle(client, {
      schema: fullSchema,
    });
  }
  return instance;
}
