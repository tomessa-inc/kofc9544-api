import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** An access role (e.g. admin). */
export const access = mysqlTable("access", {
    id: varchar("id", { length: 30 }).primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    description: varchar("description", { length: 50 }).notNull(),
});
