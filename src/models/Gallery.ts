import { boolean, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const gallery = mysqlTable("gallery", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    /** Whether the gallery is shown to visitors who are not signed in. */
    viewing: boolean("viewing").notNull(),
});
