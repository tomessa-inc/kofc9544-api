import { drizzle } from "drizzle-orm/mysql2";

/**
 * Drizzle query builder for MySQL. It has no connection of its own: mappers build queries with it and
 * hand them to a QueryExecutor (see executor.ts), which runs them through the RDS SQL proxy.
 */
export const db = drizzle.mock();
