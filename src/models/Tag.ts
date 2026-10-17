import { datetime, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const tag = mysqlTable("tag", {
    id: varchar("id", { length: 20 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: datetime("createdAt"),
    updatedAt: datetime("updatedAt"),
});
