import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Note: the table's primary key is `name`; `id` is the slug the rest of the schema references. */
export const hole = mysqlTable("hole", {
    name: varchar("name", { length: 45 }).primaryKey(),
    par: varchar("par", { length: 45 }),
    id: varchar("id", { length: 45 }),
});
