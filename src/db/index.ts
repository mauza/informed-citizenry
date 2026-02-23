import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      // Return a proxy that throws when used, allowing build to succeed
      return new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
        get(target, prop) {
          if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is required");
          }
          // During build, return a no-op function
          return () => Promise.resolve([]);
        }
      });
    }
    const sql = neon(databaseUrl);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

// Export db as a getter to allow lazy initialization
export const db = getDb();
export type DB = ReturnType<typeof drizzle<typeof schema>>;
